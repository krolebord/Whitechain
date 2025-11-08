import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ResourceContract } from "../typechain-types";

describe("ResourceContract", function () {
  async function deployResourceContractFixture() {
    const [admin, minter, burner, user] = await ethers.getSigners();

    const ResourceContractFactory = await ethers.getContractFactory("ResourceContract");
    const resourceContract = await upgrades.deployProxy(
      ResourceContractFactory,
      [admin.address, "https://api.example.com/resource/{id}.json"],
      { initializer: "initialize" }
    );

    await resourceContract.waitForDeployment();

    return { resourceContract, admin, minter, burner, user };
  }

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      const { resourceContract, admin } = await loadFixture(deployResourceContractFixture);

      expect(await resourceContract.hasRole(await resourceContract.DEFAULT_ADMIN_ROLE(), admin.address)).to.be.true;
      expect(await resourceContract.MAX_RESOURCE_ID()).to.equal(6);
    });

    it("Should have correct resource constants", async function () {
      const { resourceContract } = await loadFixture(deployResourceContractFixture);

      expect(await resourceContract.WOOD()).to.equal(1);
      expect(await resourceContract.IRON()).to.equal(2);
      expect(await resourceContract.GOLD()).to.equal(3);
      expect(await resourceContract.LEATHER()).to.equal(4);
      expect(await resourceContract.STONE()).to.equal(5);
      expect(await resourceContract.DIAMOND()).to.equal(6);
    });
  });

  describe("Access Control", function () {
    it("Should grant MINTER_ROLE", async function () {
      const { resourceContract, admin, minter } = await loadFixture(deployResourceContractFixture);

      const MINTER_ROLE = await resourceContract.MINTER_ROLE();
      await resourceContract.connect(admin).grantRole(MINTER_ROLE, minter.address);

      expect(await resourceContract.hasRole(MINTER_ROLE, minter.address)).to.be.true;
    });

    it("Should grant BURNER_ROLE", async function () {
      const { resourceContract, admin, burner } = await loadFixture(deployResourceContractFixture);

      const BURNER_ROLE = await resourceContract.BURNER_ROLE();
      await resourceContract.connect(admin).grantRole(BURNER_ROLE, burner.address);

      expect(await resourceContract.hasRole(BURNER_ROLE, burner.address)).to.be.true;
    });

    it("Should revert if non-admin tries to grant role", async function () {
      const { resourceContract, minter, user } = await loadFixture(deployResourceContractFixture);

      const MINTER_ROLE = await resourceContract.MINTER_ROLE();
      await expect(
        resourceContract.connect(user).grantRole(MINTER_ROLE, minter.address)
      ).to.be.revertedWithCustomError(resourceContract, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Minting", function () {
    it("Should mint resources with MINTER_ROLE", async function () {
      const { resourceContract, admin, minter, user } = await loadFixture(deployResourceContractFixture);

      const MINTER_ROLE = await resourceContract.MINTER_ROLE();
      await resourceContract.connect(admin).grantRole(MINTER_ROLE, minter.address);

      await resourceContract.connect(minter).mintResource(user.address, 1, 100);
      expect(await resourceContract.balanceOf(user.address, 1)).to.equal(100);
    });

    it("Should emit ResourceMinted event", async function () {
      const { resourceContract, admin, minter, user } = await loadFixture(deployResourceContractFixture);

      const MINTER_ROLE = await resourceContract.MINTER_ROLE();
      await resourceContract.connect(admin).grantRole(MINTER_ROLE, minter.address);

      await expect(resourceContract.connect(minter).mintResource(user.address, 1, 100))
        .to.emit(resourceContract, "ResourceMinted")
        .withArgs(user.address, 1, 100);
    });

    it("Should revert if caller doesn't have MINTER_ROLE", async function () {
      const { resourceContract, user } = await loadFixture(deployResourceContractFixture);

      await expect(
        resourceContract.connect(user).mintResource(user.address, 1, 100)
      ).to.be.revertedWithCustomError(resourceContract, "AccessControlUnauthorizedAccount");
    });

    it("Should revert if resource ID is invalid (0)", async function () {
      const { resourceContract, admin, minter, user } = await loadFixture(deployResourceContractFixture);

      const MINTER_ROLE = await resourceContract.MINTER_ROLE();
      await resourceContract.connect(admin).grantRole(MINTER_ROLE, minter.address);

      await expect(
        resourceContract.connect(minter).mintResource(user.address, 0, 100)
      ).to.be.revertedWith("Invalid resource ID");
    });

    it("Should revert if resource ID is invalid (>6)", async function () {
      const { resourceContract, admin, minter, user } = await loadFixture(deployResourceContractFixture);

      const MINTER_ROLE = await resourceContract.MINTER_ROLE();
      await resourceContract.connect(admin).grantRole(MINTER_ROLE, minter.address);

      await expect(
        resourceContract.connect(minter).mintResource(user.address, 7, 100)
      ).to.be.revertedWith("Invalid resource ID");
    });

    it("Should revert if minting to zero address", async function () {
      const { resourceContract, admin, minter } = await loadFixture(deployResourceContractFixture);

      const MINTER_ROLE = await resourceContract.MINTER_ROLE();
      await resourceContract.connect(admin).grantRole(MINTER_ROLE, minter.address);

      await expect(
        resourceContract.connect(minter).mintResource(ethers.ZeroAddress, 1, 100)
      ).to.be.revertedWith("Cannot mint to zero address");
    });

    it("Should revert if amount is zero", async function () {
      const { resourceContract, admin, minter, user } = await loadFixture(deployResourceContractFixture);

      const MINTER_ROLE = await resourceContract.MINTER_ROLE();
      await resourceContract.connect(admin).grantRole(MINTER_ROLE, minter.address);

      await expect(
        resourceContract.connect(minter).mintResource(user.address, 1, 0)
      ).to.be.revertedWith("Amount must be greater than zero");
    });

    it("Should mint multiple resource types", async function () {
      const { resourceContract, admin, minter, user } = await loadFixture(deployResourceContractFixture);

      const MINTER_ROLE = await resourceContract.MINTER_ROLE();
      await resourceContract.connect(admin).grantRole(MINTER_ROLE, minter.address);

      await resourceContract.connect(minter).mintResource(user.address, 1, 10);
      await resourceContract.connect(minter).mintResource(user.address, 2, 20);
      await resourceContract.connect(minter).mintResource(user.address, 3, 30);

      expect(await resourceContract.balanceOf(user.address, 1)).to.equal(10);
      expect(await resourceContract.balanceOf(user.address, 2)).to.equal(20);
      expect(await resourceContract.balanceOf(user.address, 3)).to.equal(30);
    });
  });

  describe("Burning", function () {
    it("Should burn resources with BURNER_ROLE", async function () {
      const { resourceContract, admin, minter, burner, user } = await loadFixture(deployResourceContractFixture);

      const MINTER_ROLE = await resourceContract.MINTER_ROLE();
      const BURNER_ROLE = await resourceContract.BURNER_ROLE();
      await resourceContract.connect(admin).grantRole(MINTER_ROLE, minter.address);
      await resourceContract.connect(admin).grantRole(BURNER_ROLE, burner.address);

      await resourceContract.connect(minter).mintResource(user.address, 1, 100);
      await resourceContract.connect(burner).burnResource(user.address, 1, 50);

      expect(await resourceContract.balanceOf(user.address, 1)).to.equal(50);
    });

    it("Should emit ResourceBurned event", async function () {
      const { resourceContract, admin, minter, burner, user } = await loadFixture(deployResourceContractFixture);

      const MINTER_ROLE = await resourceContract.MINTER_ROLE();
      const BURNER_ROLE = await resourceContract.BURNER_ROLE();
      await resourceContract.connect(admin).grantRole(MINTER_ROLE, minter.address);
      await resourceContract.connect(admin).grantRole(BURNER_ROLE, burner.address);

      await resourceContract.connect(minter).mintResource(user.address, 1, 100);
      await expect(resourceContract.connect(burner).burnResource(user.address, 1, 50))
        .to.emit(resourceContract, "ResourceBurned")
        .withArgs(user.address, 1, 50);
    });

    it("Should revert if caller doesn't have BURNER_ROLE", async function () {
      const { resourceContract, admin, minter, user } = await loadFixture(deployResourceContractFixture);

      const MINTER_ROLE = await resourceContract.MINTER_ROLE();
      await resourceContract.connect(admin).grantRole(MINTER_ROLE, minter.address);

      await resourceContract.connect(minter).mintResource(user.address, 1, 100);

      await expect(
        resourceContract.connect(user).burnResource(user.address, 1, 50)
      ).to.be.revertedWithCustomError(resourceContract, "AccessControlUnauthorizedAccount");
    });

    it("Should revert if resource ID is invalid", async function () {
      const { resourceContract, admin, burner, user } = await loadFixture(deployResourceContractFixture);

      const BURNER_ROLE = await resourceContract.BURNER_ROLE();
      await resourceContract.connect(admin).grantRole(BURNER_ROLE, burner.address);

      await expect(
        resourceContract.connect(burner).burnResource(user.address, 0, 50)
      ).to.be.revertedWith("Invalid resource ID");

      await expect(
        resourceContract.connect(burner).burnResource(user.address, 7, 50)
      ).to.be.revertedWith("Invalid resource ID");
    });

    it("Should revert if burning from zero address", async function () {
      const { resourceContract, admin, burner } = await loadFixture(deployResourceContractFixture);

      const BURNER_ROLE = await resourceContract.BURNER_ROLE();
      await resourceContract.connect(admin).grantRole(BURNER_ROLE, burner.address);

      await expect(
        resourceContract.connect(burner).burnResource(ethers.ZeroAddress, 1, 50)
      ).to.be.revertedWith("Cannot burn from zero address");
    });

    it("Should revert if amount is zero", async function () {
      const { resourceContract, admin, burner, user } = await loadFixture(deployResourceContractFixture);

      const BURNER_ROLE = await resourceContract.BURNER_ROLE();
      await resourceContract.connect(admin).grantRole(BURNER_ROLE, burner.address);

      await expect(
        resourceContract.connect(burner).burnResource(user.address, 1, 0)
      ).to.be.revertedWith("Amount must be greater than zero");
    });
  });

  describe("Validation", function () {
    it("Should validate resource IDs correctly", async function () {
      const { resourceContract } = await loadFixture(deployResourceContractFixture);

      expect(await resourceContract.isValidResourceId(1)).to.be.true;
      expect(await resourceContract.isValidResourceId(6)).to.be.true;
      expect(await resourceContract.isValidResourceId(0)).to.be.false;
      expect(await resourceContract.isValidResourceId(7)).to.be.false;
    });
  });

  describe("Interface Support", function () {
    it("Should support ERC1155 interface", async function () {
      const { resourceContract } = await loadFixture(deployResourceContractFixture);

      // ERC1155 interface ID: 0xd9b67a26
      const ERC1155_INTERFACE_ID = "0xd9b67a26";
      expect(await resourceContract.supportsInterface(ERC1155_INTERFACE_ID)).to.be.true;
    });

    it("Should support AccessControl interface", async function () {
      const { resourceContract } = await loadFixture(deployResourceContractFixture);

      // AccessControl interface ID: 0x7965db0b
      const ACCESS_CONTROL_INTERFACE_ID = "0x7965db0b";
      expect(await resourceContract.supportsInterface(ACCESS_CONTROL_INTERFACE_ID)).to.be.true;
    });

    it("Should not support invalid interface", async function () {
      const { resourceContract } = await loadFixture(deployResourceContractFixture);

      const INVALID_INTERFACE_ID = "0x12345678";
      expect(await resourceContract.supportsInterface(INVALID_INTERFACE_ID)).to.be.false;
    });
  });

  describe("Upgradeability", function () {
    it("Should upgrade contract", async function () {
      const { resourceContract, admin } = await loadFixture(deployResourceContractFixture);

      const ResourceContractFactory = await ethers.getContractFactory("ResourceContract");
      const upgraded = await upgrades.upgradeProxy(
        await resourceContract.getAddress(),
        ResourceContractFactory
      );

      expect(await upgraded.getAddress()).to.equal(await resourceContract.getAddress());
    });

    it("Should revert if non-admin tries to upgrade", async function () {
      const { resourceContract, user } = await loadFixture(deployResourceContractFixture);

      const ResourceContractFactory = await ethers.getContractFactory("ResourceContract");
      await expect(
        upgrades.upgradeProxy(await resourceContract.getAddress(), ResourceContractFactory, {
          call: { fn: "initialize", args: [user.address, ""] },
        })
      ).to.be.reverted;
    });
  });
});

