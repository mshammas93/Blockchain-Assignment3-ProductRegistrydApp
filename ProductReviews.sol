// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SmartContract.sol";

/// @title ProductReviews - customers rate products listed in ProductRegistry (bonus: second contract)
/// @notice This contract talks to the already-deployed ProductRegistry contract
///         to check that a product exists and who its seller is.
contract ProductReviews {
    struct Review {
        address reviewer;
        uint8 rating;     // 1 to 5 stars
        string comment;
    }

    ProductRegistry public registry;   // address of the ProductRegistry contract

    mapping(uint256 => Review[]) private reviews;                 // productId => reviews
    mapping(uint256 => uint256) private ratingTotal;              // productId => sum of ratings
    mapping(uint256 => mapping(address => bool)) public hasReviewed;

    event ReviewAdded(uint256 indexed productId, address indexed reviewer, uint8 rating, string comment);

    constructor(address _registryAddress) {
        registry = ProductRegistry(_registryAddress);
    }

    /// WRITE: leave a 1-5 star review on a product
    function addReview(uint256 _productId, uint8 _rating, string calldata _comment) external {
        require(_productId < registry.getProductCount(), "Product does not exist");
        require(_rating >= 1 && _rating <= 5, "Rating must be between 1 and 5");
        require(!hasReviewed[_productId][msg.sender], "You already reviewed this product");

        (, , address seller) = registry.getProduct(_productId);
        require(seller != msg.sender, "Sellers cannot review their own product");

        reviews[_productId].push(Review(msg.sender, _rating, _comment));
        ratingTotal[_productId] += _rating;
        hasReviewed[_productId][msg.sender] = true;

        emit ReviewAdded(_productId, msg.sender, _rating, _comment);
    }

    /// READ: number of reviews a product has
    function getReviewCount(uint256 _productId) external view returns (uint256) {
        return reviews[_productId].length;
    }

    /// READ: one review of a product
    function getReview(uint256 _productId, uint256 _index)
        external
        view
        returns (address reviewer, uint8 rating, string memory comment)
    {
        require(_index < reviews[_productId].length, "Review does not exist");
        Review storage r = reviews[_productId][_index];
        return (r.reviewer, r.rating, r.comment);
    }

    /// READ: average rating multiplied by 10 (e.g. 45 means 4.5 stars), 0 if no reviews
    function getAverageRating(uint256 _productId) external view returns (uint256) {
        uint256 count = reviews[_productId].length;
        if (count == 0) return 0;
        return (ratingTotal[_productId] * 10) / count;
    }
}
