// Migration script: tells Truffle how to deploy our contracts to the blockchain.
// Run with:  truffle migrate   (or  truffle migrate --reset  to deploy again from scratch)

const ProductRegistry = artifacts.require("ProductRegistry");
const ProductReviews = artifacts.require("ProductReviews");

module.exports = async function (deployer, network, accounts) {
  // 1) Deploy the main contract from Assignment 2
  await deployer.deploy(ProductRegistry);
  const registry = await ProductRegistry.deployed();
  console.log("   ProductRegistry deployed at:", registry.address);

  // 2) Deploy the reviews contract and give it the registry's address
  await deployer.deploy(ProductReviews, registry.address);
  const reviews = await ProductReviews.deployed();
  console.log("   ProductReviews deployed at: ", reviews.address);
  console.log("   Deployed by account:        ", accounts[0]);
};
