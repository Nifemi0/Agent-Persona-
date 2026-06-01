// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// Minimal PersonaSBT interface for the Registry to call
interface IPersonaSBT {
    function mint(address to) external returns (uint256);
}

/// PersonaRegistry stores on-chain identity data + mints a soulbound token
/// Registration auto-verifies the persona (owner = msg.sender, signature in IPFS)
contract PersonaRegistry {
    struct Persona { address owner; string cid; uint64 timestamp; bool revoked; bool verified; }
    mapping(bytes32 => Persona) public personas;

    IPersonaSBT public sbt;

    event PersonaRegistered(bytes32 indexed personaId, address indexed owner, string cid, uint64 timestamp);
    event PersonaUpdated(bytes32 indexed personaId, string cid, uint64 timestamp);
    event PersonaRevoked(bytes32 indexed personaId, address indexed owner, uint64 timestamp);
    event PersonaTransferred(bytes32 indexed personaId, address indexed oldOwner, address indexed newOwner);
    event SBTUpdated(address indexed newSBT);

    constructor(address _sbt) {
        sbt = IPersonaSBT(_sbt);
    }

    function setSBT(address _sbt) external {
        sbt = IPersonaSBT(_sbt);
        emit SBTUpdated(_sbt);
    }

    function registerPersona(bytes32 personaId, string calldata cid) external {
        Persona storage p = personas[personaId];
        require(p.owner == address(0), "ALREADY_REGISTERED");
        p.owner = msg.sender;
        p.cid = cid;
        p.timestamp = uint64(block.timestamp);
        p.revoked = false;
        p.verified = true; // registration = wallet proves ownership

        // Mint a soulbound token to the registrant
        if (address(sbt) != address(0)) {
            sbt.mint(msg.sender);
        }

        emit PersonaRegistered(personaId, msg.sender, cid, p.timestamp);
    }

    function updatePersona(bytes32 personaId, string calldata cid) external {
        Persona storage p = personas[personaId];
        require(p.owner == msg.sender, "NOT_OWNER");
        require(!p.revoked, "REVOKED");
        p.cid = cid;
        p.timestamp = uint64(block.timestamp);
        emit PersonaUpdated(personaId, cid, p.timestamp);
    }

    function revokePersona(bytes32 personaId) external {
        Persona storage p = personas[personaId];
        require(p.owner == msg.sender, "NOT_OWNER");
        require(!p.revoked, "ALREADY_REVOKED");
        p.revoked = true;
        p.timestamp = uint64(block.timestamp);
        emit PersonaRevoked(personaId, msg.sender, p.timestamp);
    }

    function transferPersona(bytes32 personaId, address newOwner) external {
        Persona storage p = personas[personaId];
        require(p.owner == msg.sender, "NOT_OWNER");
        require(newOwner != address(0), "INVALID_NEW_OWNER");
        address old = p.owner;
        p.owner = newOwner;
        p.timestamp = uint64(block.timestamp);
        emit PersonaTransferred(personaId, old, newOwner);
    }

    function getPersona(bytes32 personaId) external view returns (
        address owner,
        string memory cid,
        uint64 timestamp,
        bool revoked,
        bool verified
    ) {
        Persona storage p = personas[personaId];
        return (p.owner, p.cid, p.timestamp, p.revoked, p.verified);
    }
}
