// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title IdentityRegistry
 * @notice ERC-8004 compliant Identity Registry for AI agents.
 *
 * Deploy as a singleton per chain. Each registered agent gets an ERC-721
 * soulbound token (non-transferable) with URIStorage.
 *
 * Agent ID = incremental tokenId.
 * agentRegistry = "eip155:{chainId}:{contractAddress}"
 */
contract IdentityRegistry is ERC721URIStorage, Ownable, EIP712 {
    using ECDSA for bytes32;

    /* ────── Structs ────── */

    struct MetadataEntry {
        string metadataKey;
        bytes metadataValue;
    }

    /* ────── State ────── */

    uint256 private _nextAgentId;

    // agentId => metadataKey => metadataValue
    mapping(uint256 => mapping(string => bytes)) private _metadata;

    // agentId => agentWallet (reserved key — cannot be set via setMetadata)
    mapping(uint256 => address) private _agentWallet;

    // Tracks which metadata keys exist for an agent (for enumeration)
    mapping(uint256 => string[]) private _metadataKeys;

    // EIP-712 typehash for agent wallet change
    bytes32 private constant _SET_WALLET_TYPEHASH =
        keccak256("SetAgentWallet(uint256 agentId,address newWallet,uint256 deadline)");

    /* ────── Events ────── */

    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
    event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy);
    event MetadataSet(uint256 indexed agentId, string indexed indexedMetadataKey, string metadataKey, bytes metadataValue);
    event AgentWalletSet(uint256 indexed agentId, address indexed newWallet);
    event AgentWalletUnset(uint256 indexed agentId);

    /* ────── Errors ────── */

    error SoulboundToken();
    error AgentWalletReserved();
    error NotOwnerOrOperator();
    error InvalidDeadline();
    error InvalidSignature();
    error MetadataKeyNotFound();

    /* ────── Constructor ────── */

    constructor(
        string memory name,
        string memory symbol,
        address initialOwner
    ) ERC721(name, symbol) Ownable(initialOwner) EIP712("IdentityRegistry", "1") {
        _nextAgentId = 1; // token IDs start at 1
    }

    /* ────── Soulbound override ────── */

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert SoulboundToken();
        }
        return super._update(to, tokenId, auth);
    }

    /* ────── Registration ────── */

    function register(string calldata agentURI, MetadataEntry[] calldata metadata) external returns (uint256 agentId) {
        return _register(agentURI, metadata);
    }

    function register(string calldata agentURI) external returns (uint256 agentId) {
        return _register(agentURI, new MetadataEntry[](0));
    }

    function register() external returns (uint256 agentId) {
        return _register("", new MetadataEntry[](0));
    }

    function _register(string memory agentURI, MetadataEntry[] memory metadata) internal returns (uint256 agentId) {
        agentId = _nextAgentId++;
        _safeMint(msg.sender, agentId);

        if (bytes(agentURI).length > 0) {
            _setTokenURI(agentId, agentURI);
        }

        // Auto-set agentWallet to msg.sender
        _agentWallet[agentId] = msg.sender;
        emit MetadataSet(agentId, "agentWallet", "agentWallet", abi.encode(msg.sender));

        // Set additional metadata
        for (uint256 i = 0; i < metadata.length; i++) {
            _validateMetadataKey(metadata[i].metadataKey);
            _setMetadata(agentId, metadata[i].metadataKey, metadata[i].metadataValue);
        }

        emit Registered(agentId, agentURI, msg.sender);
    }

    /* ────── Agent URI ────── */

    function setAgentURI(uint256 agentId, string calldata newURI) external {
        _requireOwnerOrApproved(agentId);
        _setTokenURI(agentId, newURI);
        emit URIUpdated(agentId, newURI, msg.sender);
    }

    /* ────── On-chain Metadata ────── */

    function getMetadata(uint256 agentId, string calldata metadataKey) external view returns (bytes memory) {
        bytes storage value = _metadata[agentId][metadataKey];
        if (value.length == 0) revert MetadataKeyNotFound();
        return value;
    }

    function setMetadata(uint256 agentId, string calldata metadataKey, bytes calldata metadataValue) external {
        _requireOwnerOrApproved(agentId);
        _validateMetadataKey(metadataKey);
        _setMetadata(agentId, metadataKey, metadataValue);
    }

    function _setMetadata(uint256 agentId, string memory metadataKey, bytes memory metadataValue) private {
        if (_metadata[agentId][metadataKey].length == 0) {
            _metadataKeys[agentId].push(metadataKey);
        }
        _metadata[agentId][metadataKey] = metadataValue;
        emit MetadataSet(agentId, metadataKey, metadataKey, metadataValue);
    }

    function _validateMetadataKey(string memory metadataKey) private pure {
        // The key "agentWallet" is reserved — cannot be set via setMetadata or register metadata array
        if (keccak256(bytes(metadataKey)) == keccak256(bytes("agentWallet"))) {
            revert AgentWalletReserved();
        }
    }

    /* ────── Agent Wallet ────── */

    function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes calldata signature) external {
        _requireOwnerOrApproved(agentId);

        if (block.timestamp > deadline) revert InvalidDeadline();

        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(_SET_WALLET_TYPEHASH, agentId, newWallet, deadline))
        );

        address recovered = ECDSA.recover(digest, signature);
        if (recovered != newWallet) revert InvalidSignature();

        _agentWallet[agentId] = newWallet;
        emit AgentWalletSet(agentId, newWallet);
    }

    function getAgentWallet(uint256 agentId) external view returns (address) {
        return _agentWallet[agentId];
    }

    function unsetAgentWallet(uint256 agentId) external {
        _requireOwnerOrApproved(agentId);
        delete _agentWallet[agentId];
        emit AgentWalletUnset(agentId);
    }

    /* ────── ERC-8004 Helpers ────── */

    /**
     * @dev Returns the number of registered agents.
     */
    function totalSupply() external view returns (uint256) {
        return _nextAgentId - 1;
    }

    /**
     * @dev Returns the full agentRegistry identifier.
     *      e.g. "eip155:5003:0x..."
     */
    function agentRegistry(uint256 chainId) external view returns (string memory) {
        return string(abi.encodePacked("eip155:", _uintToString(chainId), ":", _toChecksumString(address(this))));
    }

    /* ────── Internal ────── */

    function _requireOwnerOrApproved(uint256 agentId) internal view {
        if (_ownerOf(agentId) != msg.sender && getApproved(agentId) != msg.sender && !isApprovedForAll(_ownerOf(agentId), msg.sender)) {
            revert NotOwnerOrOperator();
        }
    }

    function _uintToString(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 temp = v;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (v != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(v % 10)));
            v /= 10;
        }
        return string(buffer);
    }

    function _toChecksumString(address addr) internal pure returns (string memory) {
        bytes20 addrBytes = bytes20(addr);
        bytes memory ascii = new bytes(42);
        ascii[0] = '0';
        ascii[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            ascii[2 + i * 2] = _toHexDigit(uint8(addrBytes[i]) / 16);
            ascii[2 + i * 2 + 1] = _toHexDigit(uint8(addrBytes[i]) % 16);
        }
        // EIP-55 checksum
        bytes32 hash = keccak256(abi.encodePacked(ascii));
        for (uint256 i = 0; i < 40; i++) {
            uint8 char = uint8(ascii[2 + i]);
            if (char >= 97) {
                // lowercase hex letter
                if (uint8(hash[i / 2] >> (4 * (1 - (i % 2)))) >= 8) {
                    ascii[2 + i] = bytes1(uint8(char) - 32); // to uppercase
                }
            }
        }
        return string(ascii);
    }

    function _toHexDigit(uint8 d) private pure returns (bytes1) {
        if (d < 10) return bytes1(uint8(48 + d));
        return bytes1(uint8(97 + d - 10));
    }
}
