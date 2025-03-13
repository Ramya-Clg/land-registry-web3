// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract LandRegistry {
    struct Land {
        address owner;
        uint64[] h3Indexes;
        string metadataURI;
        uint256 registrationDate;
    }

    Land[] private lands;
    mapping(uint64 => uint256) private h3ToLandId;
    mapping(address => uint256[]) private ownerLands;

    event LandRegistered(uint256 indexed landId, address indexed owner, uint64[] h3Indexes);
    event LandTransferred(uint256 indexed landId, address indexed from, address indexed to);

    function registerLand(uint64[] calldata h3Indexes, string calldata metadataURI) external returns (uint256) {
        require(h3Indexes.length > 0, "Must provide at least one H3 index");

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
            metadataURI: metadataURI,
            registrationDate: block.timestamp
        }));

        for (uint256 i = 0; i < h3Indexes.length; i++) {
            h3ToLandId[h3Indexes[i]] = landId;
        }

        ownerLands[msg.sender].push(landId);

        emit LandRegistered(landId, msg.sender, h3Indexes);

        return landId;
    }

    function transferLand(uint256 landId, address newOwner) external {
        require(landId < lands.length, "Land does not exist");
        require(lands[landId].owner == msg.sender, "Not the land owner");
        require(newOwner != address(0), "Cannot transfer to zero address");

        address oldOwner = lands[landId].owner;
        lands[landId].owner = newOwner;

        ownerLands[newOwner].push(landId);

        uint256[] storage oldOwnerLands = ownerLands[oldOwner];
        for (uint256 i = 0; i < oldOwnerLands.length; i++) {
            if (oldOwnerLands[i] == landId) {
                oldOwnerLands[i] = oldOwnerLands[oldOwnerLands.length - 1];
                oldOwnerLands.pop();
                break;
            }
        }

        emit LandTransferred(landId, oldOwner, newOwner);
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
}