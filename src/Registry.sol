// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract LandRegistry {
    enum LandType { Industrial, Commercial, Agricultural, Residential }

    struct Land {
        address owner;
        uint64[] h3Indexes;
        uint256 registrationDate;
        uint256 area; 
        string propertyRegistrationNumber;
        LandType landType;
    }

    Land[] private lands;
    mapping(uint64 => uint256) private h3ToLandId;
    mapping(address => uint256[]) private ownerLands;
    mapping(string => bool) private registrationNumberExists;

    event LandRegistered(uint256 indexed landId, address indexed owner, uint64[] h3Indexes, string propertyRegistrationNumber, LandType landType);
    event LandTransferred(uint256 indexed landId, address indexed from, address indexed to);

    function registerLand(
        uint64[] calldata h3Indexes, 
        uint256 area,
        string calldata propertyRegistrationNumber,
        LandType landType
    ) external returns (uint256) {
        require(h3Indexes.length > 0, "Must provide at least one H3 index");
        require(bytes(propertyRegistrationNumber).length > 0, "Property registration number cannot be empty");
        require(!registrationNumberExists[propertyRegistrationNumber], "Property registration number already exists");

        for (uint256 i = 0; i < h3Indexes.length; i++) {
            require(h3ToLandId[h3Indexes[i]] == 0, "Land area overlaps with existing registration");
        }

        uint256 landId = lands.length;
        uint64[] memory landH3Indexes = new uint64[](h3Indexes.length);
        for (uint256 i = 0; i < h3Indexes.length; i++) {
            landH3Indexes[i] = h3Indexes[i];
        }

        lands.push(Land({
            owner: msg.sender,
            h3Indexes: landH3Indexes,
            registrationDate: block.timestamp,
            area: area,
            propertyRegistrationNumber: propertyRegistrationNumber,
            landType: landType
        }));

        for (uint256 i = 0; i < h3Indexes.length; i++) {
            h3ToLandId[h3Indexes[i]] = landId;
        }

        ownerLands[msg.sender].push(landId);
        registrationNumberExists[propertyRegistrationNumber] = true;

        emit LandRegistered(landId, msg.sender, h3Indexes, propertyRegistrationNumber, landType);

        return landId;
    }

    function getLandsByOwner(address owner) external view returns (uint256[] memory) {
        return ownerLands[owner];
    }

    function getLandById(uint256 landId) external view returns (Land memory) {
        require(landId < lands.length, "Land does not exist");
        return lands[landId];
    }

    function checkH3IndexOwnership(uint64 h3Index) external view returns (uint256) {
        return h3ToLandId[h3Index];
    }

    function isH3IndexOwnedBy(uint64 h3Index, address user) external view returns (bool) {
        uint256 landId = h3ToLandId[h3Index];
        if (landId == 0) return false;
        return lands[landId].owner == user;
    }

    function getLandsByType(LandType landType) external view returns (uint256[] memory) {
        // First count matching lands
        uint256 count = 0;
        for (uint256 i = 0; i < lands.length; i++) {
            if (lands[i].landType == landType) {
                count++;
            }
        }

        // Then create and populate result array
        uint256[] memory result = new uint256[](count);
        uint256 resultIndex = 0;
        for (uint256 i = 0; i < lands.length; i++) {
            if (lands[i].landType == landType) {
                result[resultIndex] = i;
                resultIndex++;
            }
        }

        return result;
    }

    function checkPropertyRegistrationNumber(string calldata propertyRegistrationNumber) external view returns (bool) {
        return registrationNumberExists[propertyRegistrationNumber];
    }
}