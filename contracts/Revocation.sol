// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Revocation {
    error InvalidMode(uint8 mode);

    uint8 private mode;

    mapping(address => bool) private revokedA;
    mapping(uint256 => uint256) private revokedBitmapWords;

    event RevocationModeChanged(uint8 indexed mode);
    event DeviceRevocationUpdatedA(address indexed eoa, bool status);
    event DeviceRevocationUpdatedB(uint256 indexed index, bool status);

    function setMode(uint8 newMode) external {
        if (newMode > 1) revert InvalidMode(newMode);
        mode = newMode;
        emit RevocationModeChanged(newMode);
    }

    function getMode() external view returns (uint8) {
        return mode;
    }

    function revokeDeviceA(address eoa, bool status) external {
        revokedA[eoa] = status;
        emit DeviceRevocationUpdatedA(eoa, status);
    }

    function revokeDeviceB(uint256 index, bool status) external {
        uint256 wordIndex = index >> 8;
        uint256 bitOffset = index & 0xff;
        uint256 mask = uint256(1) << bitOffset;

        if (status) {
            revokedBitmapWords[wordIndex] |= mask;
        } else {
            revokedBitmapWords[wordIndex] &= ~mask;
        }

        emit DeviceRevocationUpdatedB(index, status);
    }

    function isRevoked(address eoa, uint256 index) external view returns (bool) {
        if (mode == 0) {
            return revokedA[eoa];
        }
        return _isRevokedInBitmap(index);
    }

    function isRevokedA(address eoa) external view returns (bool) {
        return revokedA[eoa];
    }

    function isRevokedB(uint256 index) external view returns (bool) {
        return _isRevokedInBitmap(index);
    }

    function _isRevokedInBitmap(uint256 index) private view returns (bool) {
        uint256 wordIndex = index >> 8;
        uint256 bitOffset = index & 0xff;
        uint256 word = revokedBitmapWords[wordIndex];
        uint256 mask = uint256(1) << bitOffset;
        return (word & mask) != 0;
    }
}
