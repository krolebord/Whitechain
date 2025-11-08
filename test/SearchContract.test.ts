import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("SearchContract", function () {
  async function deploySearchContractFixture() {
    const [admin, user] = await ethers.getSigners();

    // Deploy ResourceContract first
    const ResourceContractFactory = await ethers.getContractFactory(
      "ResourceContract"
    );
    const resourceContract = await upgrades.deployProxy(
      ResourceContractFactory,
      [admin.address, "https://api.example.com/resource/{id}.json"],
      { initializer: "initialize" }
    );
    await resourceContract.waitForDeployment();

    // Deploy SearchContract
    const SearchContractFactory = await ethers.getContractFactory(
      "SearchContract"
    );
    const searchContract = await upgrades.deployProxy(
      SearchContractFactory,
      [admin.address, await resourceContract.getAddress()],
      { initializer: "initialize" }
    );
    await searchContract.waitForDeployment();

    // Grant MINTER_ROLE to SearchContract
    const MINTER_ROLE = await resourceContract.MINTER_ROLE();
    await resourceContract
      .connect(admin)
      .grantRole(MINTER_ROLE, await searchContract.getAddress());

    return { searchContract, resourceContract, admin, user };
  }

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      const { searchContract, resourceContract, admin } = await loadFixture(
        deploySearchContractFixture
      );

      expect(
        await searchContract.hasRole(
          await searchContract.DEFAULT_ADMIN_ROLE(),
          admin.address
        )
      ).to.be.true;
      expect(await searchContract.resourceContract()).to.equal(
        await resourceContract.getAddress()
      );
      expect(await searchContract.NUM_RESOURCES()).to.equal(6);
    });

    it("Should revert if initialized with zero address", async function () {
      const [admin] = await ethers.getSigners();
      const SearchContractFactory = await ethers.getContractFactory(
        "SearchContract"
      );

      await expect(
        upgrades.deployProxy(
          SearchContractFactory,
          [admin.address, ethers.ZeroAddress],
          { initializer: "initialize" }
        )
      ).to.be.revertedWith("Invalid resource contract address");
    });
  });

  describe("Search Functionality", function () {
    it("Should mint a random resource when searching", async function () {
      const { searchContract, resourceContract, user } = await loadFixture(
        deploySearchContractFixture
      );

      await searchContract.connect(user).search();

      // Check that user received exactly 1 resource
      let totalBalance = 0;
      for (let i = 1; i <= 6; i++) {
        const balance = await resourceContract.balanceOf(user.address, i);
        totalBalance += Number(balance);
      }

      expect(totalBalance).to.equal(1);
    });

    it("Should emit ResourceFound event", async function () {
      const { searchContract, user } = await loadFixture(
        deploySearchContractFixture
      );

      await expect(searchContract.connect(user).search()).to.emit(
        searchContract,
        "ResourceFound"
      );
    });

    it("Should mint exactly 1 resource per search", async function () {
      const { searchContract, resourceContract, user } = await loadFixture(
        deploySearchContractFixture
      );

      await searchContract.connect(user).search();
      await searchContract.connect(user).search();
      await searchContract.connect(user).search();

      let totalBalance = 0;
      for (let i = 1; i <= 6; i++) {
        const balance = await resourceContract.balanceOf(user.address, i);
        totalBalance += Number(balance);
      }

      expect(totalBalance).to.equal(3);
    });

    it("Should mint valid resource IDs (1-6)", async function () {
      const { searchContract, resourceContract, user } = await loadFixture(
        deploySearchContractFixture
      );

      // Perform multiple searches to test randomness
      for (let i = 0; i < 20; i++) {
        await searchContract.connect(user).search();
      }

      // Check that all resources are valid (1-6)
      for (let i = 1; i <= 6; i++) {
        const balance = await resourceContract.balanceOf(user.address, i);
        expect(Number(balance)).to.be.at.least(0);
      }

      // Check that no invalid resources exist
      expect(await resourceContract.balanceOf(user.address, 0)).to.equal(0);
      expect(await resourceContract.balanceOf(user.address, 7)).to.equal(0);
    });
  });

  describe("Access Control", function () {
    it("Should allow admin to set resource contract", async function () {
      const { searchContract, admin } = await loadFixture(
        deploySearchContractFixture
      );

      const [newAdmin] = await ethers.getSigners();
      const ResourceContractFactory = await ethers.getContractFactory(
        "ResourceContract"
      );
      const newResourceContract = await upgrades.deployProxy(
        ResourceContractFactory,
        [newAdmin.address, "https://api.example.com/resource/{id}.json"],
        { initializer: "initialize" }
      );
      await newResourceContract.waitForDeployment();

      await searchContract
        .connect(admin)
        .setResourceContract(await newResourceContract.getAddress());
      expect(await searchContract.resourceContract()).to.equal(
        await newResourceContract.getAddress()
      );
    });

    it("Should revert if non-admin tries to set resource contract", async function () {
      const { searchContract, user } = await loadFixture(
        deploySearchContractFixture
      );

      await expect(
        searchContract.connect(user).setResourceContract(user.address)
      ).to.be.revertedWithCustomError(
        searchContract,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("Should revert if setting resource contract to zero address", async function () {
      const { searchContract, admin } = await loadFixture(
        deploySearchContractFixture
      );

      await expect(
        searchContract.connect(admin).setResourceContract(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid resource contract address");
    });
  });

  describe("Upgradeability", function () {
    it("Should upgrade contract", async function () {
      const { searchContract } = await loadFixture(deploySearchContractFixture);

      const SearchContractFactory = await ethers.getContractFactory(
        "SearchContract"
      );
      const upgraded = await upgrades.upgradeProxy(
        await searchContract.getAddress(),
        SearchContractFactory
      );

      expect(await upgraded.getAddress()).to.equal(
        await searchContract.getAddress()
      );
    });
  });
});
