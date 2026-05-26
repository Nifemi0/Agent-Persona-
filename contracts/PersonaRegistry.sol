// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract PersonaRegistry {
    event PersonaRegistered(bytes32 indexed personaId, address indexed owner, string cid);
    event PersonaUpdated(bytes32 indexed personaId, string cid);
    event PersonaRevoked(bytes32 indexed personaId, address indexed owner);

    struct Persona { address owner; string cid; bool revoked; uint256 createdAt; uint256 updatedAt; }
    mapping(bytes32 => Persona) public personas;

    function registerPersona(bytes32 personaId, string calldata cid) external {
        require(personas[personaId].owner == address(0), "ALREADY_REGISTERED");
        personas[personaId] = Persona({ owner: msg.sender, cid: cid, revoked: false, createdAt: block.timestamp, updatedAt: block.timestamp });
        emit PersonaRegistered(personaId, msg.sender, cid);
    }

    function updatePersona(bytes32 personaId, string calldata cid) external {
        require(personas[personaId].owner == msg.sender, "NOT_OWNER");
        require(!personas[personaId].revoked, "REVOKED");
        personas[personaId].cid = cid;
        personas[personaId].updatedAt = block.timestamp;
        emit PersonaUpdated(personaId, cid);
    }

    function revokePersona(bytes32 personaId) external {
        require(personas[personaId].owner == msg.sender, "NOT_OWNER");
        personas[personaId].revoked = true;
        emit PersonaRevoked(personaId, msg.sender);
    }

    function transferPersona(bytes32 personaId, address newOwner) external {
        require(personas[personaId].owner == msg.sender, "NOT_OWNER");
        require(newOwner != address(0), "INVALID_OWNER");
        personas[personaId].owner = newOwner;
        personas[personaId].updatedAt = block.timestamp;
        emit PersonaRegistered(personaId, newOwner, personas[personaId].cid);
    }
}
