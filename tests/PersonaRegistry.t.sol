// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/PersonaRegistry.sol";

contract PersonaRegistryTest is Test {
    PersonaRegistry registry;
    address owner = address(0x1);
    address other = address(0x2);
    address newOwner = address(0x3);

    function setUp() public {
        registry = new PersonaRegistry();
    }

    function testRegisterPersona() public {
        bytes32 pid = keccak256(abi.encodePacked("persona-1"));
        vm.prank(owner);
        registry.registerPersona(pid, "cid://QmTestCID");

        (address storedOwner, string memory cid, bool revoked, uint256 createdAt, uint256 updatedAt) = getPersona(pid);
        assertEq(storedOwner, owner);
        assertEq(cid, "cid://QmTestCID");
        assertFalse(revoked);
        assertGt(createdAt, 0);
        assertEq(createdAt, updatedAt);
    }

    function testCannotReregisterSameId() public {
        bytes32 pid = keccak256(abi.encodePacked("persona-dup"));
        vm.prank(owner);
        registry.registerPersona(pid, "cid://QmTestCID");

        vm.prank(owner);
        vm.expectRevert(bytes("ALREADY_REGISTERED"));
        registry.registerPersona(pid, "cid://QmTestCID2");
    }

    function testOnlyOwnerCanUpdate() public {
        bytes32 pid = keccak256(abi.encodePacked("persona-update"));
        vm.prank(owner);
        registry.registerPersona(pid, "cid://QmTestCID");

        vm.prank(other);
        vm.expectRevert(bytes("NOT_OWNER"));
        registry.updatePersona(pid, "cid://QmNew");

        vm.prank(owner);
        registry.updatePersona(pid, "cid://QmNew");

        (, string memory cid, , , uint256 updatedAt) = getPersona(pid);
        assertEq(cid, "cid://QmNew");
        assertGt(updatedAt, 0);
    }

    function testRevokePreventsUpdate() public {
        bytes32 pid = keccak256(abi.encodePacked("persona-revoke"));
        vm.prank(owner);
        registry.registerPersona(pid, "cid://QmTestCID");

        vm.prank(owner);
        registry.revokePersona(pid);

        (, , bool revoked, , ) = getPersona(pid);
        assertTrue(revoked);

        vm.prank(owner);
        vm.expectRevert(bytes("REVOKED"));
        registry.updatePersona(pid, "cid://QmAfter");
    }

    function testTransferPersona() public {
        bytes32 pid = keccak256(abi.encodePacked("persona-transfer"));
        vm.prank(owner);
        registry.registerPersona(pid, "cid://QmTestCID");

        vm.prank(other);
        vm.expectRevert(bytes("NOT_OWNER"));
        registry.transferPersona(pid, newOwner);

        vm.prank(owner);
        registry.transferPersona(pid, newOwner);

        (address storedOwner, , , , ) = getPersona(pid);
        assertEq(storedOwner, newOwner);
    }

    // helper to read persona tuple (matching struct)
    function getPersona(bytes32 pid) internal view returns (address, string memory, bool, uint256, uint256) {
        PersonaRegistry.Persona memory p = registry.personas(pid);
        return (p.owner, p.cid, p.revoked, p.createdAt, p.updatedAt);
    }
}
