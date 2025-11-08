import { ethers, upgrades } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("Upgrading contracts with the account:", deployer.address);
  console.log("Network:", network.name, "Chain ID:", network.chainId);

  // Load deployment addresses
  const addressesPath = path.join(__dirname, "..", "deployment-addresses.json");
  if (!fs.existsSync(addressesPath)) {
    throw new Error(
      "deployment-addresses.json not found. Please deploy contracts first."
    );
  }

  const deploymentAddresses = JSON.parse(
    fs.readFileSync(addressesPath, "utf-8")
  );

  // Upgrade ResourceContract
  console.log("\nUpgrading ResourceContract...");
  const ResourceContractFactory = await ethers.getContractFactory(
    "ResourceContract"
  );
  const upgradedResourceContract = await upgrades.upgradeProxy(
    deploymentAddresses.ResourceContract.proxy,
    ResourceContractFactory
  );
  await upgradedResourceContract.waitForDeployment();
  console.log("ResourceContract upgraded");

  // Upgrade ItemContract
  console.log("\nUpgrading ItemContract...");
  const ItemContractFactory = await ethers.getContractFactory("ItemContract");
  const upgradedItemContract = await upgrades.upgradeProxy(
    deploymentAddresses.ItemContract.proxy,
    ItemContractFactory
  );
  await upgradedItemContract.waitForDeployment();
  console.log("ItemContract upgraded");

  // Upgrade SearchContract
  console.log("\nUpgrading SearchContract...");
  const SearchContractFactory = await ethers.getContractFactory(
    "SearchContract"
  );
  const upgradedSearchContract = await upgrades.upgradeProxy(
    deploymentAddresses.SearchContract.proxy,
    SearchContractFactory
  );
  await upgradedSearchContract.waitForDeployment();
  console.log("SearchContract upgraded");

  // Upgrade CraftingContract
  console.log("\nUpgrading CraftingContract...");
  const CraftingContractFactory = await ethers.getContractFactory(
    "CraftingContract"
  );
  const upgradedCraftingContract = await upgrades.upgradeProxy(
    deploymentAddresses.CraftingContract.proxy,
    CraftingContractFactory
  );
  await upgradedCraftingContract.waitForDeployment();
  console.log("CraftingContract upgraded");

  // Update implementation addresses
  deploymentAddresses.ResourceContract.implementation =
    await upgrades.erc1967.getImplementationAddress(
      deploymentAddresses.ResourceContract.proxy
    );
  deploymentAddresses.ItemContract.implementation =
    await upgrades.erc1967.getImplementationAddress(
      deploymentAddresses.ItemContract.proxy
    );
  deploymentAddresses.SearchContract.implementation =
    await upgrades.erc1967.getImplementationAddress(
      deploymentAddresses.SearchContract.proxy
    );
  deploymentAddresses.CraftingContract.implementation =
    await upgrades.erc1967.getImplementationAddress(
      deploymentAddresses.CraftingContract.proxy
    );

  // Save updated addresses
  fs.writeFileSync(addressesPath, JSON.stringify(deploymentAddresses, null, 2));
  console.log("\nDeployment addresses updated in:", addressesPath);
  console.log("\nAll contracts upgraded successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
