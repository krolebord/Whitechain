import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {
  ResourceContract,
  ItemContract,
  SearchContract,
  CraftingContract,
} from "../typechain-types";

describe("Integration Tests", function () {
  async function deployAllContractsFixture() {
    const [admin, player] = await ethers.getSigners();

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

    // Deploy SearchContract
    const SearchContractFactory = await ethers.getContractFactory("SearchContract");
    const searchContract = await upgrades.deployProxy(
      SearchContractFactory,
      [admin.address, await resourceContract.getAddress()],
      { initializer: "initialize" }
    );
    await searchContract.waitForDeployment();

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
      .grantRole(RESOURCE_MINTER_ROLE, await searchContract.getAddress());
    await resourceContract
      .connect(admin)
      .grantRole(RESOURCE_MINTER_ROLE, await craftingContract.getAddress());
    await resourceContract
      .connect(admin)
      .grantRole(RESOURCE_BURNER_ROLE, await craftingContract.getAddress());
    await itemContract
      .connect(admin)
      .grantRole(ITEM_MINTER_ROLE, await craftingContract.getAddress());

    return {
      resourceContract,
      itemContract,
      searchContract,
      craftingContract,
      admin,
      player,
    };
  }

  describe("Complete Game Flow", function () {
    it("Should allow player to search for resources and craft Cossack saber", async function () {
      const {
        resourceContract,
        itemContract,
        searchContract,
        craftingContract,
        player,
      } = await loadFixture(deployAllContractsFixture);

      // Player starts with zero resources
      for (let i = 1; i <= 6; i++) {
        expect(await resourceContract.balanceOf(player.address, i)).to.equal(0);
      }

      // Player searches multiple times to collect resources
      // Need: 3× Iron, 1× Wood, 1× Leather for Cossack saber
      // Resource IDs: Wood=1, Iron=2, Gold=3, Leather=4, Stone=5, Diamond=6
      let ironCount = 0;
      let woodCount = 0;
      let leatherCount = 0;

      // Search until we have enough resources (max 100 searches to prevent infinite loop)
      for (let i = 0; i < 100 && (ironCount < 3 || woodCount < 1 || leatherCount < 1); i++) {
        await searchContract.connect(player).search();

        const ironBalance = await resourceContract.balanceOf(player.address, 2); // Iron
        const woodBalance = await resourceContract.balanceOf(player.address, 1); // Wood
        const leatherBalance = await resourceContract.balanceOf(player.address, 4); // Leather

        ironCount = Number(ironBalance);
        woodCount = Number(woodBalance);
        leatherCount = Number(leatherBalance);
      }

      // Verify we have enough resources
      expect(ironCount).to.be.at.least(3);
      expect(woodCount).to.be.at.least(1);
      expect(leatherCount).to.be.at.least(1);

      // Craft Cossack saber
      await craftingContract.connect(player).craftCossackSaber();

      // Verify resources were burned
      expect(await resourceContract.balanceOf(player.address, 2)).to.equal(ironCount - 3); // Iron
      expect(await resourceContract.balanceOf(player.address, 1)).to.equal(woodCount - 1); // Wood
      expect(await resourceContract.balanceOf(player.address, 4)).to.equal(leatherCount - 1); // Leather

      // Verify item was minted
      // Item IDs: Cossack saber=1, Elder's staff=2, Character armor=3, Combat bracelet=4
      const tokenId = await itemContract.getTokenIdByItemType(1); // Cossack saber
      expect(await itemContract.ownerOf(tokenId)).to.equal(player.address);
    });

    it("Should allow player to craft multiple items", async function () {
      const {
        resourceContract,
        itemContract,
        searchContract,
        craftingContract,
        admin,
        player,
      } = await loadFixture(deployAllContractsFixture);

      // Grant admin MINTER_ROLE to mint resources directly for testing
      const RESOURCE_MINTER_ROLE = await resourceContract.MINTER_ROLE();
      await resourceContract.connect(admin).grantRole(RESOURCE_MINTER_ROLE, admin.address);

      // Mint resources for Cossack saber
      await resourceContract.connect(admin).mintResource(player.address, 2, 3); // Iron
      await resourceContract.connect(admin).mintResource(player.address, 1, 1); // Wood
      await resourceContract.connect(admin).mintResource(player.address, 4, 1); // Leather

      // Mint resources for Elder's staff
      await resourceContract.connect(admin).mintResource(player.address, 1, 2); // Wood
      await resourceContract.connect(admin).mintResource(player.address, 3, 1); // Gold
      await resourceContract.connect(admin).mintResource(player.address, 6, 1); // Diamond

      // Craft both items
      await craftingContract.connect(player).craftCossackSaber();
      await craftingContract.connect(player).craftEldersStaff();

      // Verify both items were minted
      const saberTokenId = await itemContract.getTokenIdByItemType(1); // Cossack saber
      const staffTokenId = await itemContract.getTokenIdByItemType(2); // Elder's staff

      expect(await itemContract.ownerOf(saberTokenId)).to.equal(player.address);
      expect(await itemContract.ownerOf(staffTokenId)).to.equal(player.address);
    });

    it("Should prevent crafting without sufficient resources", async function () {
      const { resourceContract, craftingContract, admin, player } = await loadFixture(
        deployAllContractsFixture
      );

      const RESOURCE_MINTER_ROLE = await resourceContract.MINTER_ROLE();
      await resourceContract.connect(admin).grantRole(RESOURCE_MINTER_ROLE, admin.address);

      // Mint insufficient resources (only 2 Iron instead of 3)
      await resourceContract.connect(admin).mintResource(player.address, 2, 2); // Iron
      await resourceContract.connect(admin).mintResource(player.address, 1, 1); // Wood
      await resourceContract.connect(admin).mintResource(player.address, 4, 1); // Leather

      // Should revert when trying to craft
      await expect(craftingContract.connect(player).craftCossackSaber()).to.be.reverted;
    });

    it("Should allow multiple players to search and craft independently", async function () {
      const {
        resourceContract,
        itemContract,
        searchContract,
        craftingContract,
        admin,
        player,
      } = await loadFixture(deployAllContractsFixture);

      const [player2] = await ethers.getSigners();

      // Grant admin MINTER_ROLE to mint resources directly for testing
      const RESOURCE_MINTER_ROLE = await resourceContract.MINTER_ROLE();
      await resourceContract.connect(admin).grantRole(RESOURCE_MINTER_ROLE, admin.address);

      // Mint resources for player 1
      await resourceContract.connect(admin).mintResource(player.address, 2, 3); // Iron
      await resourceContract.connect(admin).mintResource(player.address, 1, 1); // Wood
      await resourceContract.connect(admin).mintResource(player.address, 4, 1); // Leather

      // Mint resources for player 2
      await resourceContract.connect(admin).mintResource(player2.address, 2, 3); // Iron
      await resourceContract.connect(admin).mintResource(player2.address, 1, 1); // Wood
      await resourceContract.connect(admin).mintResource(player2.address, 4, 1); // Leather

      // Get initial token ID counter
      const initialTokenId = await itemContract.getCurrentTokenId();

      // Both players craft
      const tx1 = await craftingContract.connect(player).craftCossackSaber();
      const tx2 = await craftingContract.connect(player2).craftCossackSaber();

      // Get token IDs from events
      const receipt1 = await tx1.wait();
      const receipt2 = await tx2.wait();

      const event1 = receipt1?.logs.find(
        (log: any) =>
          log.topics[0] ===
          itemContract.interface.getEvent("ItemMinted").topicHash
      );
      const event2 = receipt2?.logs.find(
        (log: any) =>
          log.topics[0] ===
          itemContract.interface.getEvent("ItemMinted").topicHash
      );

      const tokenId1 = event1 ? BigInt(event1.topics[3]) : initialTokenId;
      const tokenId2 = event2 ? BigInt(event2.topics[3]) : initialTokenId + 1n;

      // Verify both players have their items
      expect(await itemContract.ownerOf(tokenId1)).to.equal(player.address);
      expect(await itemContract.ownerOf(tokenId2)).to.equal(player2.address);
      expect(tokenId1).to.not.equal(tokenId2);
    });
  });
});

