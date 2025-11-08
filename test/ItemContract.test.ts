import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ItemContract } from "../typechain-types";

describe("ItemContract", function () {
  async function deployItemContractFixture() {
    const [admin, minter, user] = await ethers.getSigners();

    const ItemContractFactory = await ethers.getContractFactory("ItemContract");
    const itemContract = await upgrades.deployProxy(
      ItemContractFactory,
      [admin.address, "Cossack Items", "COS"],
      { initializer: "initialize" }
    );

    await itemContract.waitForDeployment();

    return { itemContract, admin, minter, user };
  }

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      const { itemContract, admin } = await loadFixture(deployItemContractFixture);

      expect(await itemContract.hasRole(await itemContract.DEFAULT_ADMIN_ROLE(), admin.address)).to.be.true;
      expect(await itemContract.MAX_ITEM_ID()).to.equal(4);
      expect(await itemContract.getCurrentTokenId()).to.equal(1);
    });

    it("Should have correct item constants", async function () {
      const { itemContract } = await loadFixture(deployItemContractFixture);

      expect(await itemContract.COSSACK_SABER()).to.equal(1);
      expect(await itemContract.ELDERS_STAFF()).to.equal(2);
      expect(await itemContract.CHARACTER_ARMOR()).to.equal(3);
      expect(await itemContract.COMBAT_BRACELET()).to.equal(4);
    });
  });

  describe("Access Control", function () {
    it("Should grant MINTER_ROLE", async function () {
      const { itemContract, admin, minter } = await loadFixture(deployItemContractFixture);

      const MINTER_ROLE = await itemContract.MINTER_ROLE();
      await itemContract.connect(admin).grantRole(MINTER_ROLE, minter.address);

      expect(await itemContract.hasRole(MINTER_ROLE, minter.address)).to.be.true;
    });

    it("Should revert if non-admin tries to grant role", async function () {
      const { itemContract, minter, user } = await loadFixture(deployItemContractFixture);

      const MINTER_ROLE = await itemContract.MINTER_ROLE();
      await expect(
        itemContract.connect(user).grantRole(MINTER_ROLE, minter.address)
      ).to.be.revertedWithCustomError(itemContract, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Minting", function () {
    it("Should mint items with MINTER_ROLE", async function () {
      const { itemContract, admin, minter, user } = await loadFixture(deployItemContractFixture);

      const MINTER_ROLE = await itemContract.MINTER_ROLE();
      await itemContract.connect(admin).grantRole(MINTER_ROLE, minter.address);

      const tx = await itemContract.connect(minter).mintItem(user.address, 1);
      const receipt = await tx.wait();
      const tokenId = await itemContract.getTokenIdByItemType(1);

      expect(await itemContract.ownerOf(tokenId)).to.equal(user.address);
      expect(await itemContract.getCurrentTokenId()).to.equal(2);
    });

    it("Should emit ItemMinted event", async function () {
      const { itemContract, admin, minter, user } = await loadFixture(deployItemContractFixture);

      const MINTER_ROLE = await itemContract.MINTER_ROLE();
      await itemContract.connect(admin).grantRole(MINTER_ROLE, minter.address);

      const tx = await itemContract.connect(minter).mintItem(user.address, 1);
      const receipt = await tx.wait();
      const tokenId = await itemContract.getTokenIdByItemType(1);

      await expect(tx)
        .to.emit(itemContract, "ItemMinted")
        .withArgs(user.address, 1, tokenId);
    });

    it("Should revert if caller doesn't have MINTER_ROLE", async function () {
      const { itemContract, user } = await loadFixture(deployItemContractFixture);

      await expect(
        itemContract.connect(user).mintItem(user.address, 1)
      ).to.be.revertedWithCustomError(itemContract, "AccessControlUnauthorizedAccount");
    });

    it("Should revert if item ID is invalid (0)", async function () {
      const { itemContract, admin, minter, user } = await loadFixture(deployItemContractFixture);

      const MINTER_ROLE = await itemContract.MINTER_ROLE();
      await itemContract.connect(admin).grantRole(MINTER_ROLE, minter.address);

      await expect(
        itemContract.connect(minter).mintItem(user.address, 0)
      ).to.be.revertedWith("Invalid item ID");
    });

    it("Should revert if item ID is invalid (>4)", async function () {
      const { itemContract, admin, minter, user } = await loadFixture(deployItemContractFixture);

      const MINTER_ROLE = await itemContract.MINTER_ROLE();
      await itemContract.connect(admin).grantRole(MINTER_ROLE, minter.address);

      await expect(
        itemContract.connect(minter).mintItem(user.address, 5)
      ).to.be.revertedWith("Invalid item ID");
    });

    it("Should revert if minting to zero address", async function () {
      const { itemContract, admin, minter } = await loadFixture(deployItemContractFixture);

      const MINTER_ROLE = await itemContract.MINTER_ROLE();
      await itemContract.connect(admin).grantRole(MINTER_ROLE, minter.address);

      await expect(
        itemContract.connect(minter).mintItem(ethers.ZeroAddress, 1)
      ).to.be.revertedWith("Cannot mint to zero address");
    });

    it("Should mint multiple items with sequential token IDs", async function () {
      const { itemContract, admin, minter, user } = await loadFixture(deployItemContractFixture);

      const MINTER_ROLE = await itemContract.MINTER_ROLE();
      await itemContract.connect(admin).grantRole(MINTER_ROLE, minter.address);

      const tokenId1 = await itemContract.connect(minter).mintItem(user.address, 1);
      const tokenId2 = await itemContract.connect(minter).mintItem(user.address, 2);
      const tokenId3 = await itemContract.connect(minter).mintItem(user.address, 3);

      const id1 = await itemContract.getTokenIdByItemType(1);
      const id2 = await itemContract.getTokenIdByItemType(2);
      const id3 = await itemContract.getTokenIdByItemType(3);

      expect(id1).to.equal(1);
      expect(id2).to.equal(2);
      expect(id3).to.equal(3);
      expect(await itemContract.getCurrentTokenId()).to.equal(4);
    });

    it("Should track item types correctly", async function () {
      const { itemContract, admin, minter, user } = await loadFixture(deployItemContractFixture);

      const MINTER_ROLE = await itemContract.MINTER_ROLE();
      await itemContract.connect(admin).grantRole(MINTER_ROLE, minter.address);

      await itemContract.connect(minter).mintItem(user.address, 1);
      const tokenId = await itemContract.getTokenIdByItemType(1);

      expect(tokenId).to.equal(1);
    });
  });

  describe("Validation", function () {
    it("Should validate item IDs correctly", async function () {
      const { itemContract } = await loadFixture(deployItemContractFixture);

      expect(await itemContract.isValidItemId(1)).to.be.true;
      expect(await itemContract.isValidItemId(4)).to.be.true;
      expect(await itemContract.isValidItemId(0)).to.be.false;
      expect(await itemContract.isValidItemId(5)).to.be.false;
    });
  });

  describe("Interface Support", function () {
    it("Should support ERC721 interface", async function () {
      const { itemContract } = await loadFixture(deployItemContractFixture);

      // ERC721 interface ID: 0x80ac58cd
      const ERC721_INTERFACE_ID = "0x80ac58cd";
      expect(await itemContract.supportsInterface(ERC721_INTERFACE_ID)).to.be.true;
    });

    it("Should support AccessControl interface", async function () {
      const { itemContract } = await loadFixture(deployItemContractFixture);

      // AccessControl interface ID: 0x7965db0b
      const ACCESS_CONTROL_INTERFACE_ID = "0x7965db0b";
      expect(await itemContract.supportsInterface(ACCESS_CONTROL_INTERFACE_ID)).to.be.true;
    });

    it("Should not support invalid interface", async function () {
      const { itemContract } = await loadFixture(deployItemContractFixture);

      const INVALID_INTERFACE_ID = "0x12345678";
      expect(await itemContract.supportsInterface(INVALID_INTERFACE_ID)).to.be.false;
    });
  });

  describe("Upgradeability", function () {
    it("Should upgrade contract", async function () {
      const { itemContract, admin } = await loadFixture(deployItemContractFixture);

      const ItemContractFactory = await ethers.getContractFactory("ItemContract");
      const upgraded = await upgrades.upgradeProxy(
        await itemContract.getAddress(),
        ItemContractFactory
      );

      expect(await upgraded.getAddress()).to.equal(await itemContract.getAddress());
    });
  });
});

