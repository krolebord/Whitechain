import { ethers, upgrades } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DeploymentAddresses {
  ResourceContract: {
    implementation: string;
    proxy: string;
  };
  ItemContract: {
    implementation: string;
    proxy: string;
  };
  SearchContract: {
    implementation: string;
    proxy: string;
  };
  CraftingContract: {
    implementation: string;
    proxy: string;
  };
  network: string;
  deployer: string;
}

async function main() {
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error(
      "No accounts found. Please set PRIVATE_KEY in your .env file or configure accounts in hardhat.config.ts"
    );
  }
  const [deployer] = signers;
  const network = await ethers.provider.getNetwork();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log(
    "Account balance:",
    (await ethers.provider.getBalance(deployer.address)).toString()
  );
  console.log("Network:", network.name, "Chain ID:", network.chainId);

  const deploymentAddresses: DeploymentAddresses = {
    ResourceContract: { implementation: "", proxy: "" },
    ItemContract: { implementation: "", proxy: "" },
    SearchContract: { implementation: "", proxy: "" },
    CraftingContract: { implementation: "", proxy: "" },
    network: network.name,
    deployer: deployer.address,
  };

  // 1. Deploy ResourceContract
  console.log("\n1. Deploying ResourceContract...");
  const ResourceContractFactory = await ethers.getContractFactory(
    "ResourceContract"
  );
  const resourceContract = await upgrades.deployProxy(
    ResourceContractFactory,
    [deployer.address, "https://api.example.com/resource/{id}.json"],
    { initializer: "initialize" }
  );
  await resourceContract.waitForDeployment();
  const resourceContractAddress = await resourceContract.getAddress();
  const resourceImplementationAddress =
    await upgrades.erc1967.getImplementationAddress(resourceContractAddress);
  deploymentAddresses.ResourceContract.proxy = resourceContractAddress;
  deploymentAddresses.ResourceContract.implementation =
    resourceImplementationAddress;
  console.log("ResourceContract deployed to:", resourceContractAddress);
  console.log(
    "ResourceContract implementation:",
    resourceImplementationAddress
  );

  // 2. Deploy ItemContract
  console.log("\n2. Deploying ItemContract...");
  const ItemContractFactory = await ethers.getContractFactory("ItemContract");
  const itemContract = await upgrades.deployProxy(
    ItemContractFactory,
    [deployer.address, "Cossack Items", "COS"],
    { initializer: "initialize" }
  );
  await itemContract.waitForDeployment();
  const itemContractAddress = await itemContract.getAddress();
  const itemImplementationAddress =
    await upgrades.erc1967.getImplementationAddress(itemContractAddress);
  deploymentAddresses.ItemContract.proxy = itemContractAddress;
  deploymentAddresses.ItemContract.implementation = itemImplementationAddress;
  console.log("ItemContract deployed to:", itemContractAddress);
  console.log("ItemContract implementation:", itemImplementationAddress);

  // 3. Deploy SearchContract
  console.log("\n3. Deploying SearchContract...");
  const SearchContractFactory = await ethers.getContractFactory(
    "SearchContract"
  );
  const searchContract = await upgrades.deployProxy(
    SearchContractFactory,
    [deployer.address, resourceContractAddress],
    { initializer: "initialize" }
  );
  await searchContract.waitForDeployment();
  const searchContractAddress = await searchContract.getAddress();
  const searchImplementationAddress =
    await upgrades.erc1967.getImplementationAddress(searchContractAddress);
  deploymentAddresses.SearchContract.proxy = searchContractAddress;
  deploymentAddresses.SearchContract.implementation =
    searchImplementationAddress;
  console.log("SearchContract deployed to:", searchContractAddress);
  console.log("SearchContract implementation:", searchImplementationAddress);

  // 4. Deploy CraftingContract
  console.log("\n4. Deploying CraftingContract...");
  const CraftingContractFactory = await ethers.getContractFactory(
    "CraftingContract"
  );
  const craftingContract = await upgrades.deployProxy(
    CraftingContractFactory,
    [deployer.address, resourceContractAddress, itemContractAddress],
    { initializer: "initialize" }
  );
  await craftingContract.waitForDeployment();
  const craftingContractAddress = await craftingContract.getAddress();
  const craftingImplementationAddress =
    await upgrades.erc1967.getImplementationAddress(craftingContractAddress);
  deploymentAddresses.CraftingContract.proxy = craftingContractAddress;
  deploymentAddresses.CraftingContract.implementation =
    craftingImplementationAddress;
  console.log("CraftingContract deployed to:", craftingContractAddress);
  console.log(
    "CraftingContract implementation:",
    craftingImplementationAddress
  );

  // 5. Grant MINTER_ROLE to SearchContract on ResourceContract
  console.log("\n5. Granting MINTER_ROLE to SearchContract...");
  const RESOURCE_MINTER_ROLE = await resourceContract.MINTER_ROLE();
  const grantSearchMinterTx = await resourceContract
    .connect(deployer)
    .grantRole(RESOURCE_MINTER_ROLE, searchContractAddress);
  await grantSearchMinterTx.wait();
  console.log("MINTER_ROLE granted to SearchContract");

  // 6. Grant MINTER_ROLE and BURNER_ROLE to CraftingContract on ResourceContract
  console.log(
    "\n6. Granting MINTER_ROLE and BURNER_ROLE to CraftingContract on ResourceContract..."
  );
  const RESOURCE_BURNER_ROLE = await resourceContract.BURNER_ROLE();
  const grantCraftingMinterTx = await resourceContract
    .connect(deployer)
    .grantRole(RESOURCE_MINTER_ROLE, craftingContractAddress);
  await grantCraftingMinterTx.wait();
  const grantCraftingBurnerTx = await resourceContract
    .connect(deployer)
    .grantRole(RESOURCE_BURNER_ROLE, craftingContractAddress);
  await grantCraftingBurnerTx.wait();
  console.log(
    "MINTER_ROLE and BURNER_ROLE granted to CraftingContract on ResourceContract"
  );

  // 7. Grant MINTER_ROLE to CraftingContract on ItemContract
  console.log(
    "\n7. Granting MINTER_ROLE to CraftingContract on ItemContract..."
  );
  const ITEM_MINTER_ROLE = await itemContract.MINTER_ROLE();
  const grantItemMinterTx = await itemContract
    .connect(deployer)
    .grantRole(ITEM_MINTER_ROLE, craftingContractAddress);
  await grantItemMinterTx.wait();
  console.log("MINTER_ROLE granted to CraftingContract on ItemContract");

  // Save deployment addresses to JSON file
  const addressesPath = path.join(__dirname, "..", "deployment-addresses.json");
  fs.writeFileSync(addressesPath, JSON.stringify(deploymentAddresses, null, 2));
  console.log("\nDeployment addresses saved to:", addressesPath);

  console.log("\n=== Deployment Summary ===");
  console.log("ResourceContract (Proxy):", resourceContractAddress);
  console.log("ItemContract (Proxy):", itemContractAddress);
  console.log("SearchContract (Proxy):", searchContractAddress);
  console.log("CraftingContract (Proxy):", craftingContractAddress);
  console.log("\nAll roles have been granted successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
