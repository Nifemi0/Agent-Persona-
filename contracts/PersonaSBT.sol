// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title PersonaSBT - minimal soulbound token for persona verification
/// @notice Non-transferable token: mint only by controller
contract PersonaSBT {
    string public name = "PersonaSBT";
    string public symbol = "pSBT";

    address public controller;
    uint256 private _nextId;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _ownerToken;

    event Minted(address indexed to, uint256 indexed tokenId);
    event ControllerUpdated(address indexed oldController, address indexed newController);

    modifier onlyController() {
        require(msg.sender == controller, "ONLY_CONTROLLER");
        _;
    }

    constructor(address _controller) {
        controller = _controller;
        _nextId = 1;
    }

    function setController(address _newController) external onlyController {
        require(_newController != address(0), "INVALID_CONTROLLER");
        emit ControllerUpdated(controller, _newController);
        controller = _newController;
    }

    function mint(address to) external onlyController returns (uint256) {
        require(to != address(0), "INVALID_TO");
        require(_ownerToken[to] == 0, "ALREADY_OWNED");
        uint256 tid = _nextId++;
        _owners[tid] = to;
        _ownerToken[to] = tid;
        emit Minted(to, tid);
        return tid;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return _owners[tokenId];
    }

    function tokenOf(address owner) external view returns (uint256) {
        return _ownerToken[owner];
    }
}
