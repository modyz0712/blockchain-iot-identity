// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract IoTRegistry {
    error ZeroAddress();
    error AlreadyRegistered(address eoa);
    error NotRegistered(address eoa);

    mapping(address => uint256) private attrs;
    mapping(address => uint256) private indexOf;
    uint256 private nextIndex = 1;

    event DeviceRegistered(address indexed eoa, uint256 attributes, uint256 index);
    event AttributesUpdated(address indexed eoa, uint256 oldAttributes, uint256 newAttributes);

    function registerDevice(address eoa, uint256 attributes) external {
        if (eoa == address(0)) revert ZeroAddress();
        if (indexOf[eoa] != 0) revert AlreadyRegistered(eoa);

        uint256 idx = nextIndex;
        nextIndex += 1;
        indexOf[eoa] = idx;
        attrs[eoa] = attributes;

        emit DeviceRegistered(eoa, attributes, idx);
    }

    function updateAttributes(address eoa, uint256 newAttributes) external {
        if (indexOf[eoa] == 0) revert NotRegistered(eoa);

        uint256 old = attrs[eoa];
        attrs[eoa] = newAttributes;

        emit AttributesUpdated(eoa, old, newAttributes);
    }

    function queryAttributes(address eoa) external view returns (uint256) {
        if (indexOf[eoa] == 0) revert NotRegistered(eoa);
        return attrs[eoa];
    }

    function getDeviceIndex(address eoa) external view returns (uint256) {
        if (indexOf[eoa] == 0) revert NotRegistered(eoa);
        return indexOf[eoa];
    }
}
