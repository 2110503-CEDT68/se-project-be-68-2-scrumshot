const Campground = require("../models/Campground");
const Booking = require("../models/Booking");
const mongoose = require("mongoose");

// @desc     Get all campgrounds
// @route    GET /api/v1/campgrounds
// @access   Public
exports.getCampgrounds = async (req, res, next) => {
  const searchTerm = req.query.name;
  const hasCustomSort = req.query.sort;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  //Copy query and prepare filter
  const reqQuery = { ...req.query };
  const removeFields = ["select", "sort", "page", "limit", "name"];
  removeFields.forEach((param) => delete reqQuery[param]);

  //Create query string for additional filters
  let queryStr = JSON.stringify(reqQuery);
  queryStr = queryStr.replace(
    /\b(gt|gte|lt|lte|in)\b/g,
    (match) => `$${match}`,
  );
  let additionalFilters = JSON.parse(queryStr);

  try {
    // Build aggregation pipeline
    let pipeline = [];

    // Stage 1: Use MongoDB Atlas fuzzy search if search term provided
    if (searchTerm && !hasCustomSort) {
      pipeline.push({
        $search: {
          text: {
            query: searchTerm,
            path: "name",
            fuzzy: {
              maxEdits: 2
            }
          }
        }
      });
      // Add score for sorting by relevance
      pipeline.push({
        $addFields: {
          searchScore: { $meta: "searchScore" }
        }
      });
    }

    // Stage 2: Apply additional filters
    if (Object.keys(additionalFilters).length > 0) {
      pipeline.push({ $match: additionalFilters });
    }

    // Stage 3: Sort
    if (hasCustomSort) {
      const sortBy = hasCustomSort.split(",").reduce((acc, field) => {
        const trimmed = field.trim();
        acc[trimmed.startsWith('-') ? trimmed.slice(1) : trimmed] = trimmed.startsWith('-') ? -1 : 1;
        return acc;
      }, {});
      pipeline.push({ $sort: sortBy });
    } else if (searchTerm) {
      // Sort by search score descending, then by createdAt descending
      pipeline.push({
        $sort: {
          searchScore: -1,
          createdAt: -1
        }
      });
    } else {
      // Default: sort by createdAt descending
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    // Stage 4: Count total before pagination
    let countPipeline = [...pipeline];
    countPipeline.push({ $count: "total" });
    const countResult = await Campground.aggregate(countPipeline);
    const total = countResult.length > 0 ? countResult[0].total : 0;

    // Stage 5: Pagination
    pipeline.push({ $skip: startIndex });
    pipeline.push({ $limit: limit });

    // Stage 6: Populate bookings (lookup)
    pipeline.push({
      $lookup: {
        from: "bookings",
        localField: "_id",
        foreignField: "campground",
        as: "bookings"
      }
    });

    // Execute aggregation
    const campgrounds = await Campground.aggregate(pipeline);

    // Get ratings
    const campgroundIds = campgrounds.map(camp => camp._id);
    const rating = await Booking.aggregate([
      {
        $match: {
          campground: { $in: campgroundIds },
          "review.rating": { $exists: true, $ne: null },
          "review.isHidden": { $ne: true }
        }
      },
      {
        $group: {
          _id: "$campground",
          avgRating: { $avg: "$review.rating" },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    // Format response
    const formattedCampgrounds = campgrounds.map(camp => {
      const ratingData = rating.find(r => r._id.toString() === camp._id.toString());
      return {
        ...camp,
        avgRating: ratingData ? Math.round(ratingData.avgRating * 10) / 10 : 0,
        totalReviews: ratingData ? ratingData.totalReviews : 0
      };
    });

    // Pagination result
    const pagination = {};
    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }
    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res
      .status(200)
      .json({ success: true, count: formattedCampgrounds.length, pagination, data: formattedCampgrounds });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc     Get single Campground
// @route    GET /api/v1/campgrounds/:id
// @access   Public
exports.getCampground = async (req, res, next) => {
  try {
    const campground = await Campground.findById(req.params.id);
    if (!campground) return res.status(400).json({ success: false, message: "Campground not found" });
    
    const ratingData = await Booking.aggregate([
      {
        $match: {
          campground: campground._id,
          "review.rating": { $exists: true, $ne: null },
          "review.isHidden": { $ne: true }
        }
      },
      {
        $group: {
          _id: "$campground",
          avgRating: { $avg: "$review.rating" },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    const avgRating = ratingData.length > 0 ? Math.round(ratingData[0].avgRating * 10) / 10 : 0;
    const totalReviews = ratingData.length > 0 ? ratingData[0].totalReviews : 0;  

    res.status(200).json({ success: true, data: {
        ...campground._doc,
        avgRating,
        totalReviews
      } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc     Create new Campground
// @route    POST /api/v1/campgrounds
// @access   Private
exports.createCampground = async (req, res, next) => {
  if (req.body.pricePerNight < 0) return res.status(400).json({ success: false, message: "Price per night must be a positive number" });
  const campground = await Campground.create(req.body);
  res.status(201).json({ success: true, data: campground });
};

// @desc    Update Campground
// @route   PUT /api/v1/campgrounds/:id
// @access  Private
exports.updateCampground = async (req, res, next) => {
  try {
    const campground = await Campground.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!campground) {
      return res.status(400).json({ success: false });
    }

    res.status(200).json({ success: true, data: campground });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc     Delete Campground
// @route    DELETE /api/v1/campgrounds/:id
// @access   Private
exports.deleteCampground = async (req, res, next) => {
  try {
    const campground = await Campground.findById(req.params.id);

    if (!campground) {
      return res.status(404).json({
        success: false,
        message: `Campground not found with id of ${req.params.id}`,
      });
    }

    await Booking.deleteMany({ campground: req.params.id });
    await Campground.deleteOne({ _id: req.params.id });

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
