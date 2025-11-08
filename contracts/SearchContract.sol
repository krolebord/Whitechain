// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./ResourceContract.sol";

/**
 * @title SearchContract
 * @dev Allows players to search for random resources
 * @notice Players can call search() to receive a random resource (NFT1155)
 * @notice Resources are minted directly to the player's address
 */
contract SearchContract is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    /// @dev Reference to the ResourceContract
    ResourceContract public resourceContract;

    /// @dev Number of resources that can be found
    uint256 public constant NUM_RESOURCES = 6;

    /// @dev Event emitted when a player searches and finds a resource
    event ResourceFound(address indexed player, uint256 indexed resourceId, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the contract
     * @param admin Address that will receive the DEFAULT_ADMIN_ROLE
     * @param _resourceContract Address of the ResourceContract
     */
    function initialize(
        address admin,
        address _resourceContract
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        require(_resourceContract != address(0), "Invalid resource contract address");
        resourceContract = ResourceContract(_resourceContract);
    }

    /**
     * @dev Search for a random resource
     * @notice Mints a random resource (1-6) to the caller
     * @notice Each resource has equal probability (1/6)
     */
    function search() external {
        uint256 randomResourceId = _getRandomResource();
        uint256 amount = 1; // Always mint 1 resource per search

        resourceContract.mintResource(msg.sender, randomResourceId, amount);

        emit ResourceFound(msg.sender, randomResourceId, amount);
    }

    /**
     * @dev Set the resource contract address
     * @param _resourceContract Address of the new ResourceContract
     * @notice Only accounts with DEFAULT_ADMIN_ROLE can call this function
     */
    function setResourceContract(address _resourceContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_resourceContract != address(0), "Invalid resource contract address");
        resourceContract = ResourceContract(_resourceContract);
    }

    /**
     * @dev Generate a random resource ID (1-6)
     * @return uint256 Random resource ID between 1 and 6
     * @notice Uses block.timestamp and block.prevrandao for randomness
     */
    function _getRandomResource() internal view returns (uint256) {
        // Combine block.timestamp and block.prevrandao for better randomness
        uint256 random = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    msg.sender,
                    block.number
                )
            )
        );

        // Return a resource ID between 1 and 6
        return (random % NUM_RESOURCES) + 1;
    }

    /**
     * @dev Authorize upgrade (UUPS pattern)
     * @param newImplementation Address of the new implementation
     * @notice Only accounts with DEFAULT_ADMIN_ROLE can authorize upgrades
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}

