// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./ResourceContract.sol";
import "./ItemContract.sol";

/**
 * @title CraftingContract
 * @dev Allows players to combine resources to create items
 * @notice Players can craft 4 different items by burning the required resources
 * @notice Crafted items are minted as NFT721 tokens
 */
contract CraftingContract is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    /// @dev Reference to the ResourceContract
    ResourceContract public resourceContract;

    /// @dev Reference to the ItemContract
    ItemContract public itemContract;

    /// @dev Event emitted when an item is crafted
    event ItemCrafted(
        address indexed player,
        uint256 indexed itemId,
        uint256 indexed tokenId
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the contract
     * @param admin Address that will receive the DEFAULT_ADMIN_ROLE
     * @param _resourceContract Address of the ResourceContract
     * @param _itemContract Address of the ItemContract
     */
    function initialize(
        address admin,
        address _resourceContract,
        address _itemContract
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        require(_resourceContract != address(0), "Invalid resource contract address");
        require(_itemContract != address(0), "Invalid item contract address");
        resourceContract = ResourceContract(_resourceContract);
        itemContract = ItemContract(_itemContract);
    }

    /**
     * @dev Craft a Cossack saber
     * @notice Burns 3× Iron, 1× Wood, 1× Leather and mints 1 Cossack saber
     * @notice Requires the player to have sufficient resources
     */
    function craftCossackSaber() external {
        // Check and burn required resources
        // Resource IDs: Wood=1, Iron=2, Gold=3, Leather=4, Stone=5, Diamond=6
        resourceContract.burnResource(msg.sender, 2, 3); // Iron
        resourceContract.burnResource(msg.sender, 1, 1); // Wood
        resourceContract.burnResource(msg.sender, 4, 1); // Leather

        // Mint the item
        // Item IDs: Cossack saber=1, Elder's staff=2, Character armor=3, Combat bracelet=4
        uint256 tokenId = itemContract.mintItem(msg.sender, 1);

        emit ItemCrafted(msg.sender, 1, tokenId);
    }

    /**
     * @dev Craft an Elder's staff
     * @notice Burns 2× Wood, 1× Gold, 1× Diamond and mints 1 Elder's staff
     * @notice Requires the player to have sufficient resources
     */
    function craftEldersStaff() external {
        // Check and burn required resources
        // Resource IDs: Wood=1, Iron=2, Gold=3, Leather=4, Stone=5, Diamond=6
        resourceContract.burnResource(msg.sender, 1, 2); // Wood
        resourceContract.burnResource(msg.sender, 3, 1); // Gold
        resourceContract.burnResource(msg.sender, 6, 1); // Diamond

        // Mint the item
        // Item IDs: Cossack saber=1, Elder's staff=2, Character armor=3, Combat bracelet=4
        uint256 tokenId = itemContract.mintItem(msg.sender, 2);

        emit ItemCrafted(msg.sender, 2, tokenId);
    }

    /**
     * @dev Craft Character armor
     * @notice Burns 4× Leather, 2× Iron, 1× Gold and mints 1 Character armor
     * @notice Requires the player to have sufficient resources
     */
    function craftCharacterArmor() external {
        // Check and burn required resources
        // Resource IDs: Wood=1, Iron=2, Gold=3, Leather=4, Stone=5, Diamond=6
        resourceContract.burnResource(msg.sender, 4, 4); // Leather
        resourceContract.burnResource(msg.sender, 2, 2); // Iron
        resourceContract.burnResource(msg.sender, 3, 1); // Gold

        // Mint the item
        // Item IDs: Cossack saber=1, Elder's staff=2, Character armor=3, Combat bracelet=4
        uint256 tokenId = itemContract.mintItem(msg.sender, 3);

        emit ItemCrafted(msg.sender, 3, tokenId);
    }

    /**
     * @dev Craft a Combat bracelet
     * @notice Burns 4× Iron, 2× Gold, 2× Diamond and mints 1 Combat bracelet
     * @notice Requires the player to have sufficient resources
     */
    function craftCombatBracelet() external {
        // Check and burn required resources
        // Resource IDs: Wood=1, Iron=2, Gold=3, Leather=4, Stone=5, Diamond=6
        resourceContract.burnResource(msg.sender, 2, 4); // Iron
        resourceContract.burnResource(msg.sender, 3, 2); // Gold
        resourceContract.burnResource(msg.sender, 6, 2); // Diamond

        // Mint the item
        // Item IDs: Cossack saber=1, Elder's staff=2, Character armor=3, Combat bracelet=4
        uint256 tokenId = itemContract.mintItem(msg.sender, 4);

        emit ItemCrafted(msg.sender, 4, tokenId);
    }

    /**
     * @dev Set the resource and item contract addresses
     * @param _resourceContract Address of the new ResourceContract
     * @param _itemContract Address of the new ItemContract
     * @notice Only accounts with DEFAULT_ADMIN_ROLE can call this function
     */
    function setContracts(
        address _resourceContract,
        address _itemContract
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_resourceContract != address(0), "Invalid resource contract address");
        require(_itemContract != address(0), "Invalid item contract address");
        resourceContract = ResourceContract(_resourceContract);
        itemContract = ItemContract(_itemContract);
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

