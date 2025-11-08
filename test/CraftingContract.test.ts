import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { CraftingContract, ResourceContract, ItemContract } from "../typechain-types";

describe("CraftingContract", function () {
  async function deployCraftingContractFixture() {
    const [admin, user] = await ethers.getSigners();

    // Deploy ResourceContract
    const ResourceContractFactory = await ethers.getContractFactory("ResourceContract");
    const resourceContract = await upgrades.deployProxy(
      ResourceContractFactory,
      [admin.address, "https://api.example.com/resource/{id}.json"],
      { initializer: "initialize" }
    );
    await resourceContract.waitForDeployment();

    // Deploy ItemContract
    const ItemContractFactory = await ethers.getContractFactory("ItemContract");
    const itemContract = await upgrades.deployProxy(
      ItemContractFactory,
      [admin.address, "Cossack Items", "COS"],
      { initializer: "initialize" }
    );
    await itemContract.waitForDeployment();

    // Deploy CraftingContract
    const CraftingContractFactory = await ethers.getContractFactory("CraftingContract");
    const craftingContract = await upgrades.deployProxy(
      CraftingContractFactory,
      [
        admin.address,
        await resourceContract.getAddress(),
        await itemContract.getAddress(),
      ],
      { initializer: "initialize" }
    );
    await craftingContract.waitForDeployment();

    // Grant roles
    const RESOURCE_MINTER_ROLE = await resourceContract.MINTER_ROLE();
    const RESOURCE_BURNER_ROLE = await resourceContract.BURNER_ROLE();
    const ITEM_MINTER_ROLE = await itemContract.MINTER_ROLE();

    await resourceContract
      .connect(admin)
      .grantRole(RESOURCE_MINTER_ROLE, await craftingContract.getAddress());
    await resourceContract
      .connect(admin)
      .grantRole(RESOURCE_BURNER_ROLE, await craftingContract.getAddress());
    await itemContract
      .connect(admin)
      .grantRole(ITEM_MINTER_ROLE, await craftingContract.getAddress());

    return { craftingContract, resourceContract, itemContract, admin, user };
  }

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      const { craftingContract, resourceContract, itemContract, admin } = await loadFixture(
        deployCraftingContractFixture
      );

      expect(await craftingContract.hasRole(await craftingContract.DEFAULT_ADMIN_ROLE(), admin.address)).to.be.true;
      expect(await craftingContract.resourceContract()).to.equal(await resourceContract.getAddress());
      expect(await craftingContract.itemContract()).to.equal(await itemContract.getAddress());
    });

    it("Should revert if initialized with zero address for resource contract", async function () {
      const [admin] = await ethers.getSigners();
      const CraftingContractFactory = await ethers.getContractFactory("CraftingContract");

      const ItemContractFactory = await ethers.getContractFactory("ItemContract");
      const itemContract = await upgrades.deployProxy(
        ItemContractFactory,
        [admin.address, "Cossack Items", "COS"],
        { initializer: "initialize" }
      );
      await itemContract.waitForDeployment();

      await expect(
        upgrades.deployProxy(
          CraftingContractFactory,
          [admin.address, ethers.ZeroAddress, await itemContract.getAddress()],
          { initializer: "initialize" }
        )
      ).to.be.revertedWith("Invalid resource contract address");
    });

    it("Should revert if initialized with zero address for item contract", async function () {
      const [admin] = await ethers.getSigners();
      const CraftingContractFactory = await ethers.getContractFactory("CraftingContract");

      const ResourceContractFactory = await ethers.getContractFactory("ResourceContract");
      const resourceContract = await upgrades.deployProxy(
        ResourceContractFactory,
        [admin.address, "https://api.example.com/resource/{id}.json"],
        { initializer: "initialize" }
      );
      await resourceContract.waitForDeployment();

      await expect(
        upgrades.deployProxy(
          CraftingContractFactory,
          [admin.address, await resourceContract.getAddress(), ethers.ZeroAddress],
          { initializer: "initialize" }
        )
      ).to.be.revertedWith("Invalid item contract address");
    });
  });

  describe("Craft Cossack Saber", function () {
    it("Should craft Cossack saber with correct resources", async function () {
      const { craftingContract, resourceContract, itemContract, admin, user } = await loadFixture(
        deployCraftingContractFixture
      );

      // Mint required resources: 3× Iron, 1× Wood, 1× Leather
      // Resource IDs: Wood=1, Iron=2, Gold=3, Leather=4, Stone=5, Diamond=6
      const RESOURCE_MINTER_ROLE = await resourceContract.MINTER_ROLE();
      await resourceContract.connect(admin).grantRole(RESOURCE_MINTER_ROLE, admin.address);
      await resourceContract.connect(admin).mintResource(user.address, 2, 3); // Iron
      await resourceContract.connect(admin).mintResource(user.address, 1, 1); // Wood
      await resourceContract.connect(admin).mintResource(user.address, 4, 1); // Leather

      // Craft the item
      await craftingContract.connect(user).craftCossackSaber();

      // Verify resources were burned
      expect(await resourceContract.balanceOf(user.address, 2)).to.equal(0); // Iron
      expect(await resourceContract.balanceOf(user.address, 1)).to.equal(0); // Wood
      expect(await resourceContract.balanceOf(user.address, 4)).to.equal(0); // Leather

      // Verify item was minted
      // Item IDs: Cossack saber=1, Elder's staff=2, Character armor=3, Combat bracelet=4
      const tokenId = await itemContract.getTokenIdByItemType(1);
      expect(await itemContract.ownerOf(tokenId)).to.equal(user.address);
    });

    it("Should emit ItemCrafted event", async function () {
      const { craftingContract, resourceContract, itemContract, admin, user } = await loadFixture(
        deployCraftingContractFixture
      );

      const RESOURCE_MINTER_ROLE = await resourceContract.MINTER_ROLE();
      await resourceContract.connect(admin).grantRole(RESOURCE_MINTER_ROLE, admin.address);
      await resourceContract.connect(admin).mintResource(user.address, 2, 3); // Iron
      await resourceContract.connect(admin).mintResource(user.address, 1, 1); // Wood
      await resourceContract.connect(admin).mintResource(user.address, 4, 1); // Leather

      await expect(craftingContract.connect(user).craftCossackSaber())
        .to.emit(craftingContract, "ItemCrafted");
    });

    it("Should revert if insufficient resources", async function () {
      const { craftingContract, resourceContract, admin, user } = await loadFixture(
        deployCraftingContractFixture
      );

      const RESOURCE_MINTER_ROLE = await resourceContract.MINTER_ROLE();
      await resourceContract.connect(admin).grantRole(RESOURCE_MINTER_ROLE, admin.address);
      // Only mint 2 Iron instead of 3
      await resourceContract.connect(admin).mintResource(user.address, 2, 2); // Iron
      await resourceContract.connect(admin).mintResource(user.address, 1, 1); // Wood
      await resourceContract.connect(admin).mintResource(user.address, 4, 1); // Leather

      await expect(craftingContract.connect(user).craftCossackSaber()).to.be.reverted;
    });
  });

  describe("Craft Elder's Staff", function () {
    it("Should craft Elder's staff with correct resources", async function () {
      const { craftingContract, resourceContract, itemContract, admin, user } = await loadFixture(
        deployCraftingContractFixture
      );

      // Mint required resources: 2× Wood, 1× Gold, 1× Diamond
      const RESOURCE_MINTER_ROLE = await resourceContract.MINTER_ROLE();
      await resourceContract.connect(admin).grantRole(RESOURCE_MINTER_ROLE, admin.address);
      await resourceContract.connect(admin).mintResource(user.address, 1, 2); // Wood
      await resourceContract.connect(admin).mintResource(user.address, 3, 1); // Gold
      await resourceContract.connect(admin).mintResource(user.address, 6, 1); // Diamond

      // Craft the item
      await craftingContract.connect(user).craftEldersStaff();

      // Verify resources were burned
      expect(await resourceContract.balanceOf(user.address, 1)).to.equal(0); // Wood
      expect(await resourceContract.balanceOf(user.address, 3)).to.equal(0); // Gold
      expect(await resourceContract.balanceOf(user.address, 6)).to.equal(0); // Diamond

      // Verify item was minted
      const tokenId = await itemContract.getTokenIdByItemType(2); // Elder's staff
      expect(await itemContract.ownerOf(tokenId)).to.equal(user.address);
    });

    it("Should revert if insufficient resources", async function () {
      const { craftingContract, resourceContract, admin, user } = await loadFixture(
        deployCraftingContractFixture
      );

      const RESOURCE_MINTER_ROLE = await resourceContract.MINTER_ROLE();
      await resourceContract.connect(admin).grantRole(RESOURCE_MINTER_ROLE, admin.address);
      // Only mint 1 Wood instead of 2
      await resourceContract.connect(admin).mintResource(user.address, 1, 1); // Wood
      await resourceContract.connect(admin).mintResource(user.address, 3, 1); // Gold
      await resourceContract.connect(admin).mintResource(user.address, 6, 1); // Diamond

      await expect(craftingContract.connect(user).craftEldersStaff()).to.be.reverted;
    });
  });

  describe("Craft Character Armor", function () {
    it("Should craft Character armor with correct resources", async function () {
      const { craftingContract, resourceContract, itemContract, admin, user } = await loadFixture(
        deployCraftingContractFixture
      );

      // Mint required resources: 4× Leather, 2× Iron, 1× Gold
      const RESOURCE_MINTER_ROLE = await resourceContract.MINTER_ROLE();
      await resourceContract.connect(admin).grantRole(RESOURCE_MINTER_ROLE, admin.address);
      await resourceContract.connect(admin).mintResource(user.address, 4, 4); // Leather
      await resourceContract.connect(admin).mintResource(user.address, 2, 2); // Iron
      await resourceContract.connect(admin).mintResource(user.address, 3, 1); // Gold

      // Craft the item
      await craftingContract.connect(user).craftCharacterArmor();

      // Verify resources were burned
      expect(await resourceContract.balanceOf(user.address, 4)).to.equal(0); // Leather
      expect(await resourceContract.balanceOf(user.address, 2)).to.equal(0); // Iron
      expect(await resourceContract.balanceOf(user.address, 3)).to.equal(0); // Gold

      // Verify item was minted
      const tokenId = await itemContract.getTokenIdByItemType(3); // Character armor
      expect(await itemContract.ownerOf(tokenId)).to.equal(user.address);
    });
  });

  describe("Craft Combat Bracelet", function () {
    it("Should craft Combat bracelet with correct resources", async function () {
      const { craftingContract, resourceContract, itemContract, admin, user } = await loadFixture(
        deployCraftingContractFixture
      );

      // Mint required resources: 4× Iron, 2× Gold, 2× Diamond
      const RESOURCE_MINTER_ROLE = await resourceContract.MINTER_ROLE();
      await resourceContract.connect(admin).grantRole(RESOURCE_MINTER_ROLE, admin.address);
      await resourceContract.connect(admin).mintResource(user.address, 2, 4); // Iron
      await resourceContract.connect(admin).mintResource(user.address, 3, 2); // Gold
      await resourceContract.connect(admin).mintResource(user.address, 6, 2); // Diamond

      // Craft the item
      await craftingContract.connect(user).craftCombatBracelet();

      // Verify resources were burned
      expect(await resourceContract.balanceOf(user.address, 2)).to.equal(0); // Iron
      expect(await resourceContract.balanceOf(user.address, 3)).to.equal(0); // Gold
      expect(await resourceContract.balanceOf(user.address, 6)).to.equal(0); // Diamond

      // Verify item was minted
      const tokenId = await itemContract.getTokenIdByItemType(4); // Combat bracelet
      expect(await itemContract.ownerOf(tokenId)).to.equal(user.address);
    });
  });

  describe("Access Control", function () {
    it("Should allow admin to set contracts", async function () {
      const { craftingContract, admin } = await loadFixture(deployCraftingContractFixture);

      const [newAdmin] = await ethers.getSigners();
      const ResourceContractFactory = await ethers.getContractFactory("ResourceContract");
      const ItemContractFactory = await ethers.getContractFactory("ItemContract");

      const newResourceContract = await upgrades.deployProxy(
        ResourceContractFactory,
        [newAdmin.address, "https://api.example.com/resource/{id}.json"],
        { initializer: "initialize" }
      );
      await newResourceContract.waitForDeployment();

      const newItemContract = await upgrades.deployProxy(
        ItemContractFactory,
        [newAdmin.address, "Cossack Items", "COS"],
        { initializer: "initialize" }
      );
      await newItemContract.waitForDeployment();

      await craftingContract
        .connect(admin)
        .setContracts(await newResourceContract.getAddress(), await newItemContract.getAddress());

      expect(await craftingContract.resourceContract()).to.equal(await newResourceContract.getAddress());
      expect(await craftingContract.itemContract()).to.equal(await newItemContract.getAddress());
    });

    it("Should revert if non-admin tries to set contracts", async function () {
      const { craftingContract, user } = await loadFixture(deployCraftingContractFixture);

      await expect(
        craftingContract.connect(user).setContracts(user.address, user.address)
      ).to.be.revertedWithCustomError(craftingContract, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Upgradeability", function () {
    it("Should upgrade contract", async function () {
      const { craftingContract } = await loadFixture(deployCraftingContractFixture);

      const CraftingContractFactory = await ethers.getContractFactory("CraftingContract");
      const upgraded = await upgrades.upgradeProxy(
        await craftingContract.getAddress(),
        CraftingContractFactory
      );

      expect(await upgraded.getAddress()).to.equal(await craftingContract.getAddress());
    });
  });
});

