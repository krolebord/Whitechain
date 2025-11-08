// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title ItemContract
 * @dev Manages game items as NFT721 tokens
 * @notice This contract handles the 4 craftable items: Cossack saber, Elder's staff, Character armor, Combat bracelet
 * @notice Items can only be minted by authorized contracts (CraftingContract)
 */
contract ItemContract is
    Initializable,
    ERC721Upgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    /// @dev Role identifier for accounts that can mint items
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @dev Item token IDs
    uint256 public constant COSSACK_SABER = 1;
    uint256 public constant ELDERS_STAFF = 2;
    uint256 public constant CHARACTER_ARMOR = 3;
    uint256 public constant COMBAT_BRACELET = 4;

    /// @dev Maximum item ID
    uint256 public constant MAX_ITEM_ID = 4;

    /// @dev Counter for token IDs (starts at 1)
    uint256 private _tokenIdCounter;

    /// @dev Mapping from item type to token ID
    mapping(uint256 => uint256) private _itemTypeToTokenId;

    /// @dev Event emitted when an item is minted
    event ItemMinted(address indexed to, uint256 indexed itemId, uint256 indexed tokenId);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the contract
     * @param admin Address that will receive the DEFAULT_ADMIN_ROLE
     * @param name Name of the NFT collection
     * @param symbol Symbol of the NFT collection
     */
    function initialize(
        address admin,
        string memory name,
        string memory symbol
    ) public initializer {
        __ERC721_init(name, symbol);
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _tokenIdCounter = 1;
    }

    /**
     * @dev Mint an item to an address
     * @param to Address to mint item to
     * @param itemId Item type ID (1-4)
     * @return tokenId The token ID of the minted item
     * @notice Only accounts with MINTER_ROLE can call this function
     * @notice Item ID must be between 1 and 4
     */
    function mintItem(
        address to,
        uint256 itemId
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        require(itemId >= 1 && itemId <= MAX_ITEM_ID, "Invalid item ID");
        require(to != address(0), "Cannot mint to zero address");

        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        _safeMint(to, tokenId);
        _itemTypeToTokenId[itemId] = tokenId;

        emit ItemMinted(to, itemId, tokenId);

        return tokenId;
    }

    /**
     * @dev Get the token ID for a specific item type
     * @param itemId Item type ID (1-4)
     * @return tokenId The token ID associated with the item type
     */
    function getTokenIdByItemType(uint256 itemId) external view returns (uint256) {
        require(itemId >= 1 && itemId <= MAX_ITEM_ID, "Invalid item ID");
        return _itemTypeToTokenId[itemId];
    }

    /**
     * @dev Check if an item ID is valid
     * @param itemId Item type ID to check
     * @return bool True if item ID is valid (1-4)
     */
    function isValidItemId(uint256 itemId) external pure returns (bool) {
        return itemId >= 1 && itemId <= MAX_ITEM_ID;
    }

    /**
     * @dev Get the current token ID counter
     * @return uint256 The next token ID that will be minted
     */
    function getCurrentTokenId() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev Required by AccessControl
     * @param interfaceId Interface ID to check
     * @return bool True if interface is supported
     */
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC721Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
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

