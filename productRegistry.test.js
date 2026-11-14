// Automated tests for both contracts. Run with:  truffle test
const ProductRegistry = artifacts.require("ProductRegistry");
const ProductReviews = artifacts.require("ProductReviews");

// helper: checks that a transaction fails with the expected error message
async function expectRevert(promise, message) {
  try {
    await promise;
  } catch (err) {
    assert(err.message.includes(message), `Expected "${message}" but got "${err.message}"`);
    return;
  }
  assert.fail("Expected the transaction to fail, but it succeeded");
}

contract("ProductRegistry", (accounts) => {
  const [seller, buyer] = accounts;
  let registry;

  beforeEach(async () => {
    registry = await ProductRegistry.new({ from: seller });
  });

  it("sets the deployer as owner", async () => {
    assert.equal(await registry.owner(), seller);
  });

  it("adds a product and reads it back", async () => {
    await registry.addProduct("Laptop Bag", 2500, { from: seller });
    assert.equal((await registry.getProductCount()).toNumber(), 1);

    const product = await registry.getProduct(0);
    assert.equal(product.name, "Laptop Bag");
    assert.equal(product.price.toNumber(), 2500);
    assert.equal(product.seller, seller);
  });

  it("lets the seller update the price", async () => {
    await registry.addProduct("Laptop Bag", 2500, { from: seller });
    await registry.updatePrice(0, 2200, { from: seller });
    const product = await registry.getProduct(0);
    assert.equal(product.price.toNumber(), 2200);
  });

  it("blocks other accounts from updating the price", async () => {
    await registry.addProduct("Laptop Bag", 2500, { from: seller });
    await expectRevert(
      registry.updatePrice(0, 1, { from: buyer }),
      "Only the seller can update the price"
    );
  });

  it("rejects an empty name and a zero price", async () => {
    await expectRevert(registry.addProduct("", 100), "Product name is required");
    await expectRevert(registry.addProduct("Mug", 0), "Price must be greater than zero");
  });
});

contract("ProductReviews", (accounts) => {
  const [seller, buyer1, buyer2] = accounts;
  let registry, reviews;

  beforeEach(async () => {
    registry = await ProductRegistry.new({ from: seller });
    reviews = await ProductReviews.new(registry.address);
    await registry.addProduct("Coffee Mug", 400, { from: seller });
  });

  it("stores reviews and calculates the average rating", async () => {
    await reviews.addReview(0, 5, "Great mug", { from: buyer1 });
    await reviews.addReview(0, 4, "Good value", { from: buyer2 });

    assert.equal((await reviews.getReviewCount(0)).toNumber(), 2);
    assert.equal((await reviews.getAverageRating(0)).toNumber(), 45); // 4.5 stars

    const review = await reviews.getReview(0, 0);
    assert.equal(review.reviewer, buyer1);
    assert.equal(review.comment, "Great mug");
  });

  it("rejects invalid ratings, duplicate reviews and self-reviews", async () => {
    await expectRevert(reviews.addReview(0, 6, "x", { from: buyer1 }), "Rating must be between 1 and 5");
    await expectRevert(reviews.addReview(5, 3, "x", { from: buyer1 }), "Product does not exist");
    await expectRevert(reviews.addReview(0, 3, "x", { from: seller }), "Sellers cannot review their own product");

    await reviews.addReview(0, 3, "ok", { from: buyer1 });
    await expectRevert(reviews.addReview(0, 4, "again", { from: buyer1 }), "You already reviewed this product");
  });
});
