// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title ResourceContract
 * @dev Manages game resources as NFT1155 tokens
 * @notice This contract handles the 6 main resources: Wood, Iron, Gold, Leather, Stone, Diamond
 * @notice Resources can only be minted or burned by authorized contracts (SearchContract, CraftingContract)
 */
contract ResourceContract is
    Initializable,
    ERC1155Upgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    /// @dev Role identifier for accounts that can mint resources
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    /// @dev Role identifier for accounts that can burn resources
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    /// @dev Resource token IDs
    uint256 public constant WOOD = 1;
    uint256 public constant IRON = 2;
    uint256 public constant GOLD = 3;
    uint256 public constant LEATHER = 4;
    uint256 public constant STONE = 5;
    uint256 public constant DIAMOND = 6;

    /// @dev Maximum resource ID
    uint256 public constant MAX_RESOURCE_ID = 6;

    /// @dev Event emitted when resources are minted
    event ResourceMinted(address indexed to, uint256 indexed resourceId, uint256 amount);

    /// @dev Event emitted when resources are burned
    event ResourceBurned(address indexed from, uint256 indexed resourceId, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the contract
     * @param admin Address that will receive the DEFAULT_ADMIN_ROLE
     * @param uri Base URI for token metadata
     */
    function initialize(address admin, string memory uri) public initializer {
        __ERC1155_init(uri);
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /**
     * @dev Mint resources to an address
     * @param to Address to mint resources to
     * @param resourceId Resource token ID (1-6)
     * @param amount Amount of resources to mint
     * @notice Only accounts with MINTER_ROLE can call this function
     * @notice Resource ID must be between 1 and 6
     */
    function mintResource(
        address to,
        uint256 resourceId,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) {
        require(resourceId >= 1 && resourceId <= MAX_RESOURCE_ID, "Invalid resource ID");
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than zero");

        _mint(to, resourceId, amount, "");

        emit ResourceMinted(to, resourceId, amount);
    }

    /**
     * @dev Burn resources from an address
     * @param from Address to burn resources from
     * @param resourceId Resource token ID (1-6)
     * @param amount Amount of resources to burn
     * @notice Only accounts with BURNER_ROLE can call this function
     * @notice Resource ID must be between 1 and 6
     */
    function burnResource(
        address from,
        uint256 resourceId,
        uint256 amount
    ) external onlyRole(BURNER_ROLE) {
        require(resourceId >= 1 && resourceId <= MAX_RESOURCE_ID, "Invalid resource ID");
        require(from != address(0), "Cannot burn from zero address");
        require(amount > 0, "Amount must be greater than zero");

        _burn(from, resourceId, amount);

        emit ResourceBurned(from, resourceId, amount);
    }

    /**
     * @dev Check if a resource ID is valid
     * @param resourceId Resource token ID to check
     * @return bool True if resource ID is valid (1-6)
     */
    function isValidResourceId(uint256 resourceId) external pure returns (bool) {
        return resourceId >= 1 && resourceId <= MAX_RESOURCE_ID;
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
        override(ERC1155Upgradeable, AccessControlUpgradeable)
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

