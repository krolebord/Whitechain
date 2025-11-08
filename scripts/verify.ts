import { run } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  // Check if API key is set
  if (!process.env.WHITECHAIN_API_KEY || process.env.WHITECHAIN_API_KEY === "") {
    console.warn(
      "\n⚠️  WARNING: WHITECHAIN_API_KEY is not set in your .env file."
    );
    console.warn(
      "Some explorers may not require an API key, but verification might fail."
    );
    console.warn(
      "If verification fails, please add WHITECHAIN_API_KEY to your .env file.\n"
    );
  }

  const addressesPath = require("path").join(
    __dirname,
    "..",
    "deployment-addresses.json"
  );
  const fs = require("fs");

  if (!fs.existsSync(addressesPath)) {
    throw new Error(
      "deployment-addresses.json not found. Please deploy contracts first."
    );
  }

  const deploymentAddresses = JSON.parse(
    fs.readFileSync(addressesPath, "utf-8")
  );

  console.log("Verifying contracts on explorer...");

  // Verify ResourceContract implementation
  console.log("\nVerifying ResourceContract implementation...");
  try {
    await run("verify:verify", {
      address: deploymentAddresses.ResourceContract.implementation,
      constructorArguments: [],
    });
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("ResourceContract implementation already verified");
    } else {
      console.error("Error verifying ResourceContract:", error.message);
    }
  }

  // Verify ItemContract implementation
  console.log("\nVerifying ItemContract implementation...");
  try {
    await run("verify:verify", {
      address: deploymentAddresses.ItemContract.implementation,
      constructorArguments: [],
    });
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("ItemContract implementation already verified");
    } else {
      console.error("Error verifying ItemContract:", error.message);
    }
  }

  // Verify SearchContract implementation
  console.log("\nVerifying SearchContract implementation...");
  try {
    await run("verify:verify", {
      address: deploymentAddresses.SearchContract.implementation,
      constructorArguments: [],
    });
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("SearchContract implementation already verified");
    } else {
      console.error("Error verifying SearchContract:", error.message);
    }
  }

  // Verify CraftingContract implementation
  console.log("\nVerifying CraftingContract implementation...");
  try {
    await run("verify:verify", {
      address: deploymentAddresses.CraftingContract.implementation,
      constructorArguments: [],
    });
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("CraftingContract implementation already verified");
    } else {
      console.error("Error verifying CraftingContract:", error.message);
    }
  }

  console.log("\nVerification complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
