const Campground = require("../models/Campground");
const Booking = require("../models/Booking");
const mongoose = require("mongoose");

// @desc    Get all campgrounds
// @route   GET /api/v1/campgrounds
// @access  Public
exports.getCampgrounds = async (req, res, next) => {
  const validRegions = ["Northern", "Northeastern", "Western", "Central", "Eastern", "South"];

  // รวม region[] และ region เข้าด้วยกัน
  const rawRegion = req.query.region;
  delete req.query.region;

  let regionFilter = null;
  if (rawRegion) {
    const regions = Array.isArray(rawRegion) ? rawRegion : [rawRegion];
    const validatedRegions = regions
      .map(r => validRegions.find(v => v.toLowerCase() === r.toLowerCase()))
      .filter(Boolean);

    if (validatedRegions.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid region. Allowed values are: ${validRegions.join(', ')}`
      });
    }

    regionFilter = { $in: validatedRegions };
  }

  const searchTerm = req.query.name;
  const hasCustomSort = req.query.sort;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  console.log("Received query parameters:", req.query);

  const reqQuery = { ...req.query };

  let avgRatingFilter = null;
  if (reqQuery.minRating || reqQuery.maxRating) {
    avgRatingFilter = {};
    if (reqQuery.minRating) avgRatingFilter.gte = parseFloat(reqQuery.minRating);
    if (reqQuery.maxRating) avgRatingFilter.lte = parseFloat(reqQuery.maxRating);
    delete reqQuery.minRating;
    delete reqQuery.maxRating;
  }

  let priceFilter = {};
  let hasPriceFilter = false;
  if (reqQuery.minPrice) {
    priceFilter.$gte = parseFloat(reqQuery.minPrice);
    hasPriceFilter = true;
    delete reqQuery.minPrice;
  }
  if (reqQuery.maxPrice) {
    priceFilter.$lte = parseFloat(reqQuery.maxPrice);
    hasPriceFilter = true;
    delete reqQuery.maxPrice;
  }

  const removeFields = ["select", "sort", "page", "limit", "sortBy", "sortOrder", "name"];
  removeFields.forEach((param) => delete reqQuery[param]);

  let queryStr = JSON.stringify(reqQuery);
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, (match) => `$${match}`);
  let additionalFilters = JSON.parse(queryStr);

  if (hasPriceFilter) {
    additionalFilters.pricePerNight = { ...additionalFilters.pricePerNight, ...priceFilter };
  }

  // ใส่ regionFilter แยกต่างหาก ไม่ผ่าน JSON.stringify
  if (regionFilter) {
    additionalFilters.region = regionFilter;
  }
  console.log("rawRegion:", rawRegion);
console.log("regionFilter:", regionFilter);
console.log("additionalFilters:", JSON.stringify(additionalFilters));
  try {
    let pipeline = [];

    if (searchTerm && !hasCustomSort) {
      pipeline.push({
        $search: {
          index: "nameSearchIndex",
          autocomplete: {
            query: searchTerm,
            path: "name",
            fuzzy: { maxEdits: 2, prefixLength: 0 }
          }
        }
      });
      pipeline.push({ $addFields: { searchScore: { $meta: "searchScore" } } });
    }

    if (Object.keys(additionalFilters).length > 0) {
      pipeline.push({ $match: additionalFilters });
    }

    if (hasCustomSort) {
      const sortBy = hasCustomSort.split(",").reduce((acc, field) => {
        const trimmed = field.trim();
        acc[trimmed.startsWith('-') ? trimmed.slice(1) : trimmed] = trimmed.startsWith('-') ? -1 : 1;
        return acc;
      }, {});
      pipeline.push({ $sort: sortBy });
    } else if (searchTerm) {
      pipeline.push({ $sort: { searchScore: -1, createdAt: -1 } });
    } else {
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    let countPipeline = [...pipeline];
    countPipeline.push({ $count: "total" });
    const countResult = await Campground.aggregate(countPipeline);
    const total = countResult.length > 0 ? countResult[0].total : 0;

    pipeline.push({ $skip: startIndex });
    pipeline.push({ $limit: limit });
    pipeline.push({
      $lookup: {
        from: "bookings",
        localField: "_id",
        foreignField: "campground",
        as: "bookings"
      }
    });

    const campgrounds = await Campground.aggregate(pipeline);

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

    let formattedCampgrounds = campgrounds.map(camp => {
      const ratingData = rating.find(r => r._id.toString() === camp._id.toString());
      return {
        ...camp,
        avgRating: ratingData ? Math.round(ratingData.avgRating * 10) / 10 : 0,
        totalReviews: ratingData ? ratingData.totalReviews : 0
      };
    });

    if (avgRatingFilter) {
      formattedCampgrounds = formattedCampgrounds.filter(camp => {
        let isMatch = true;
        if (avgRatingFilter.gte !== undefined) isMatch = isMatch && camp.avgRating >= avgRatingFilter.gte;
        if (avgRatingFilter.lte !== undefined) isMatch = isMatch && camp.avgRating <= avgRatingFilter.lte;
        return isMatch;
      });
    }

    const pagination = {};
    if (endIndex < total) pagination.next = { page: page + 1, limit };
    if (startIndex > 0) pagination.prev = { page: page - 1, limit };

    res.status(200).json({ success: true, count: formattedCampgrounds.length, pagination, data: formattedCampgrounds });
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

    res.status(200).json({ success: true, data: { ...campground._doc, avgRating, totalReviews } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Create new Campground
// @route   POST /api/v1/campgrounds
// @access  Private
exports.createCampground = async (req, res, next) => {
  try {
    if (req.body.pricePerNight < 0) {
      return res.status(400).json({
        success: false,
        message: "Price per night must be a positive number"
      });
    }
    const campground = await Campground.create(req.body);
    res.status(201).json({ success: true, data: campground });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Update Campground
// @route   PUT /api/v1/campgrounds/:id
// @access  Private
exports.updateCampground = async (req, res, next) => {
  try {
    const campground = await Campground.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!campground) return res.status(400).json({ success: false });
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

    const activeBookings = await Booking.find({
      campground: req.params.id,
      bookEndDate: { $gte: new Date() }
    });

    if (activeBookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete campground with ${activeBookings.length} active booking(s). Please cancel all active bookings first.`,
      });
    }

    await Booking.deleteMany({ campground: req.params.id });
    await Campground.deleteOne({ _id: req.params.id });

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};