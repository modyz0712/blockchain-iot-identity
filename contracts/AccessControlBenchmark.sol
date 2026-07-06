// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IIoTRegistry {
    function queryAttributes(address eoa) external view returns (uint256);
    function getDeviceIndex(address eoa) external view returns (uint256);
}

interface IRevocation {
    function isRevoked(address eoa, uint256 index) external view returns (bool);
}

contract AccessControlBenchmark {
    error ZeroAddress();

    IIoTRegistry public immutable registry;
    IRevocation public immutable revocation;

    event AccessVerified(
        address indexed requester,
        address indexed target,
        uint256 requiredMask,
        bool granted,
        bool revoked,
        uint256 requesterAttributes,
        uint256 requesterIndex
    );

    constructor(address registryAddress, address revocationAddress) {
        if (registryAddress == address(0) || revocationAddress == address(0)) {
            revert ZeroAddress();
        }
        registry = IIoTRegistry(registryAddress);
        revocation = IRevocation(revocationAddress);
    }

    function verifyAccess(
        address requester,
        address target,
        uint256 requiredMask
    ) external returns (bool granted) {
        uint256 requesterAttributes = registry.queryAttributes(requester);
        uint256 requesterIndex = registry.getDeviceIndex(requester);
        bool revoked = revocation.isRevoked(requester, requesterIndex);

        granted = !revoked && ((requesterAttributes & requiredMask) == requiredMask);

        emit AccessVerified(
            requester,
            target,
            requiredMask,
            granted,
            revoked,
            requesterAttributes,
            requesterIndex
        );

        return granted;
    }
}
