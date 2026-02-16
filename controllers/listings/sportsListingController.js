/**
 * Sports Listing Controller
 * Handles CRUD operations for sports equipment and memorabilia listings
 */

import SportsListing from "../../models/listings/sportsListing.js";
import User from "../../models/user/user.js";
import notificationManager from "../../services/notificationManager.js";

/**
 * Create a new sports listing
 * POST /api/sports-listings
 */
export const createSportsListing = async (req, res, next) => {
  try {
    console.log("Creating new sports listing");
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    // Get user information
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Extract data from request
    const {
      category,
      categorySlug,
      completionMode,
      aiFeatures,
      photos,
      title,
      description,
      brand,
      model,
      club,
      season,
      size,
      condition,
      verification,
      aiData,
      verificationStatus,
      listingType,
      price,
      startPrice,
      bidStep,
      duration,
    } = req.body;

    // Validate required fields
    if (!category || !categorySlug) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one photo is required",
      });
    }

    if (!title || title.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    // Validate listing type specific fields
    if (listingType === "auction") {
      if (!startPrice || startPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: "Start price is required for auctions",
        });
      }
      if (!bidStep || bidStep <= 0) {
        return res.status(400).json({
          success: false,
          message: "Bid step is required for auctions",
        });
      }
    } else if (listingType === "buy_now") {
      if (!price || price <= 0) {
        return res.status(400).json({
          success: false,
          message: "Price is required for buy now listings",
        });
      }
    }

    // Set main image (first photo)
    const mainImage = photos[0]?.url || "";

    // Calculate auction end date if auction
    let auctionEndDate = null;
    if (listingType === "auction" && duration) {
      const durationMap = {
        "1d": 1,
        "3d": 3,
        "5d": 5,
        "7d": 7,
        "10d": 10,
        "14d": 14,
      };
      const days = durationMap[duration] || 7;
      auctionEndDate = new Date();
      auctionEndDate.setDate(auctionEndDate.getDate() + days);
    }

    // Set expiration date (30 days for regular users)
    let expiresAt = null;
    if (user.role !== "admin" && user.role !== "moderator") {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
    }

    // Create new listing
    const newListing = new SportsListing({
      // Basic info
      title: title.trim(),
      description: description || "",
      category,
      categorySlug,

      // Product details
      brand: brand || "",
      model: model || "",
      club: club || "",
      season: season || "",
      size: size || "",
      condition: condition || "excellent",

      // Verification
      verification: verification || {
        hasAutograph: false,
        autographDetails: "",
        isVintage: false,
        vintageYear: "",
        tagCondition: "intact",
        hasDefects: false,
        defects: [],
      },

      // AI data (if provided)
      aiData: aiData || null,
      verificationStatus: verificationStatus || "NOT_AI_VERIFIED",

      // Listing type & pricing
      listingType: listingType || "auction",
      price: listingType === "buy_now" ? parseFloat(price) || 0 : 0,
      startPrice: listingType === "auction" ? parseFloat(startPrice) || 0 : 0,
      bidStep: listingType === "auction" ? parseFloat(bidStep) || 0 : 0,
      duration: duration || "7d",
      auctionEndDate,

      // Photos
      photos: photos.map((photo) => ({
        id: photo.id,
        url: photo.url,
        typeHint: photo.typeHint || null,
      })),
      mainImage,

      // Owner info
      user: req.user.userId,
      ownerName: user.name || "",
      ownerEmail: user.email || "",
      ownerPhone: user.phoneNumber || "",

      // Status
      status:
        user.role === "admin" || user.role === "moderator"
          ? "approved"
          : "pending_payment",

      // Expiration
      expiresAt,
    });

    // Save to database
    const savedListing = await newListing.save();
    console.log("Sports listing created successfully:", savedListing._id);

    // Create notification
    try {
      await notificationManager.notifyAdCreated(
        req.user.userId,
        title,
        savedListing._id
      );
    } catch (notificationError) {
      console.error("Error creating notification:", notificationError);
    }

    // Return success response
    res.status(201).json({
      success: true,
      message: "Sports listing created successfully",
      data: savedListing,
    });
  } catch (error) {
    console.error("Error creating sports listing:", error);
    next(error);
  }
};

/**
 * Get all sports listings with filtering and pagination
 * GET /api/sports-listings
 */
export const getAllSportsListings = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 30,
      category,
      brand,
      club,
      minPrice,
      maxPrice,
      listingType,
      condition,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    // Build filter - only active/approved listings
    const filter = {
      status: { $in: ["active", "approved"] },
    };

    if (category) filter.category = category;
    if (brand) filter.brand = new RegExp(brand, "i");
    if (club) filter.club = new RegExp(club, "i");
    if (listingType) filter.listingType = listingType;
    if (condition) filter.condition = condition;

    // Price filtering
    if (minPrice || maxPrice) {
      filter.$or = [];

      // For buy_now listings, check price field
      const buyNowFilter = { listingType: "buy_now" };
      if (minPrice) buyNowFilter.price = { $gte: parseFloat(minPrice) };
      if (maxPrice)
        buyNowFilter.price = {
          ...buyNowFilter.price,
          $lte: parseFloat(maxPrice),
        };
      filter.$or.push(buyNowFilter);

      // For auction listings, check startPrice field
      const auctionFilter = { listingType: "auction" };
      if (minPrice) auctionFilter.startPrice = { $gte: parseFloat(minPrice) };
      if (maxPrice)
        auctionFilter.startPrice = {
          ...auctionFilter.startPrice,
          $lte: parseFloat(maxPrice),
        };
      filter.$or.push(auctionFilter);
    }

    // Sorting
    const sortOptions = {};
    sortOptions[sortBy] = order === "desc" ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const listings = await SportsListing.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select("-__v");

    const totalListings = await SportsListing.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: listings,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalListings / parseInt(limit)),
        totalItems: totalListings,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error getting sports listings:", error);
    next(error);
  }
};

/**
 * Get single sports listing by ID
 * GET /api/sports-listings/:id
 */
export const getSportsListingById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const listing = await SportsListing.findById(id).populate(
      "user",
      "name email phoneNumber"
    );

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    // Increment view count
    listing.views += 1;
    await listing.save();

    res.status(200).json({
      success: true,
      data: listing,
    });
  } catch (error) {
    console.error("Error getting sports listing:", error);
    next(error);
  }
};

/**
 * Update sports listing
 * PUT /api/sports-listings/:id
 */
export const updateSportsListing = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find listing
    const listing = await SportsListing.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    // Check ownership
    if (
      listing.user.toString() !== req.user.userId &&
      req.user.role !== "admin" &&
      req.user.role !== "moderator"
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this listing",
      });
    }

    // Update fields
    const allowedUpdates = [
      "title",
      "description",
      "brand",
      "model",
      "club",
      "season",
      "size",
      "condition",
      "verification",
      "price",
      "startPrice",
      "bidStep",
      "photos",
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        listing[field] = req.body[field];
      }
    });

    // Update main image if photos changed
    if (req.body.photos && req.body.photos.length > 0) {
      listing.mainImage = req.body.photos[0].url;
    }

    const updatedListing = await listing.save();

    res.status(200).json({
      success: true,
      message: "Listing updated successfully",
      data: updatedListing,
    });
  } catch (error) {
    console.error("Error updating sports listing:", error);
    next(error);
  }
};

/**
 * Delete sports listing
 * DELETE /api/sports-listings/:id
 */
export const deleteSportsListing = async (req, res, next) => {
  try {
    const { id } = req.params;

    const listing = await SportsListing.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    // Check ownership
    if (
      listing.user.toString() !== req.user.userId &&
      req.user.role !== "admin" &&
      req.user.role !== "moderator"
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this listing",
      });
    }

    await SportsListing.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Listing deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting sports listing:", error);
    next(error);
  }
};

/**
 * Place a bid on an auction listing
 * POST /api/sports-listings/:id/bid
 */
export const placeBid = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { bidAmount } = req.body;

    if (!bidAmount || bidAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid bid amount is required",
      });
    }

    const listing = await SportsListing.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    if (listing.listingType !== "auction") {
      return res.status(400).json({
        success: false,
        message: "This listing is not an auction",
      });
    }

    // Check if auction has ended
    if (listing.auctionEndDate && new Date() > listing.auctionEndDate) {
      return res.status(400).json({
        success: false,
        message: "This auction has ended",
      });
    }

    // Place bid using model method
    try {
      listing.placeBid(req.user.userId, parseFloat(bidAmount));
      await listing.save();

      res.status(200).json({
        success: true,
        message: "Bid placed successfully",
        data: {
          currentBid: listing.currentBid,
          bidCount: listing.bidCount,
        },
      });
    } catch (bidError) {
      return res.status(400).json({
        success: false,
        message: bidError.message,
      });
    }
  } catch (error) {
    console.error("Error placing bid:", error);
    next(error);
  }
};

export default {
  createSportsListing,
  getAllSportsListings,
  getSportsListingById,
  updateSportsListing,
  deleteSportsListing,
  placeBid,
};
