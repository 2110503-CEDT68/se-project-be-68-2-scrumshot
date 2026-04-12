const Booking = require("../models/Booking");
const Campground = require("../models/Campground");

//@desc     Get all bookings
//@route    GET /api/v1/bookings
//@access   Public
exports.getBookings = async (req, res, next) => {
  let query;
  // General users can see only their Bookings!
  if (req.user.role !== "admin") {
    query = Booking.find({ user: req.user.id });
  } else {
    query = Booking.find();
  }

  query = query.populate({
    path: "campground",
    select: "name province tel",
  });

  try {
    const bookings = await query;

    const cleanBookings = bookings.map(booking => {
      const b = booking.toJSON();
      if (b.review && !b.review.rating) {
        delete b.review;
      } 
      else if (b.review && b.review.isHidden && req.user.role !== "admin") {
        b.review = { isHidden: true, adminModified: b.review.adminModified };
      }
      return b;
    });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: cleanBookings,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Cannot find Booking" });
  }
};

// @desc    Get single Booking
// @route   GET /api/v1/bookings/:id
// @access  Public
exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate({
      path: "campground",
      select: "name description tel",
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `No Booking with the id of ${req.params.id}`,
      });
    }

    if (booking.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to view this Booking`,
      });
    }

    let cleanBooking = booking.toJSON();

    if (cleanBooking.review && !cleanBooking.review.rating) {
      delete cleanBooking.review;
    } else if (cleanBooking.review && cleanBooking.review.isHidden && req.user.role !== "admin") {
      cleanBooking.review = { isHidden: true, adminModified: cleanBooking.review.adminModified };
    }

    res.status(200).json({
      success: true,
      data: cleanBooking,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Cannot find Booking",
    });
  }
};

// @desc    Add Booking
// @route   POST /api/v1/campgrounds/:campgroundId/bookings
// @access  Private
exports.addBooking = async (req, res, next) => {
  try {
    if (!req.body.bookDate || !req.body.bookEndDate) {
      return res.status(400).json({
        success: false,
        message: "Please provide both bookDate and bookEndDate",
      });
    }

    const startDate = new Date(req.body.bookDate);
    const endDate = new Date(req.body.bookEndDate);

    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: "bookEndDate must be later than bookDate",
      });
    }

    if ((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) > 3) {
      return res.status(400).json({
        success: false,
        message: "Booking duration cannot exceed 3 days",
      });
    }

    // Add Campground ID to req.body
    req.body.campground = req.params.campgroundId;

    const campground = await Campground.findById(req.params.campgroundId);

    if (!campground) {
      return res.status(404).json({
        success: false,
        message: `No Campground with the id of ${req.params.campgroundId}`,
      });
    }

    req.body.user = req.user.id;

    const numOfNights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    req.body.totalPrice = numOfNights * campground.pricePerNight;

    const booking = await Booking.create(req.body);

    res.status(201).json({
      success: true,
      data: booking,
    });
  } catch (err) {
    console.log(err.stack);
    return res.status(500).json({
      success: false,
      message: "Cannot create Booking",
    });
  }
};

// @desc    Update Booking
// @route   PUT /api/v1/bookings/:id
// @access  Private
exports.updateBooking = async (req, res, next) => {
  try {
    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `No Booking with the id of ${req.params.id}`,
      });
    }
    if (booking.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to update this Booking`,
      });
    }

    if (req.user.role !== "admin") {
      delete req.body.user; 
      delete req.body.totalPrice;
    }

    if (req.body.bookDate || req.body.bookEndDate || req.body.campground) {
      const startDate = new Date(req.body.bookDate || booking.bookDate);
      const endDate = new Date(req.body.bookEndDate || booking.bookEndDate);

      if (endDate <= startDate) {
        return res.status(400).json({
          success: false,
          message: "bookEndDate must be later than bookDate",
        });
      }

      const numOfNights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if ( numOfNights > 3 ) {
        return res.status(400).json({
          success: false,
          message: "Booking duration cannot exceed 3 days",
        });
      }

      const targetCampgroundId = req.body.campground || booking.campground;
      const campgroundInfo = await Campground.findById(targetCampgroundId);

      if (!campgroundInfo) {
        return res.status(404).json({
          success: false,
          message: `No Campground with the id of ${targetCampgroundId}`,
        });
      }

      req.body.totalPrice = numOfNights * campgroundInfo.pricePerNight;
    }

    booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Cannot update Booking",
    });
  }
};

// @desc    Delete Booking
// @route   DELETE /api/v1/bookings/:id
// @access  Private
exports.deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `No Booking with the id of ${req.params.id}`,
      });
    }

    if (booking.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to delete this Booking`,
      });
    }

    await booking.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Cannot delete Booking",
    });
  }
};

// @desc    Get all reviews for a campground
// @route   GET /api/v1/campgrounds/:campgroundId/reviews
// @access  Public
exports.getCampgroundReviews = async (req, res, next) => {
  try {
    const campground = await Campground.findById(req.params.campgroundId);
    if (!campground) {
      return res.status(404).json({
        success: false,
        message: `No campground with the id of ${req.params.campgroundId}`,
      });
    }

    const bookingsWithReviews = await Booking.find({
      campground: req.params.campgroundId,
      "review.rating": { $exists: true, $ne: null },
      "review.isHidden": { $ne: true },
    })
      .populate({
        path: "user",
        select: "name",
      })
      .sort("-createdAt");

    const reviews = bookingsWithReviews.map((booking) => ({
      _id: booking._id,
      rating: booking.review.rating,
      comment: booking.review.comment,
      isLocked: booking.review.isLocked,
      user: booking.user,
      createdAt: booking.createdAt,
    }));

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get single review (from a booking)
// @route   GET /api/v1/bookings/:id/review
// @access  Public
exports.getReview = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({
        path: "campground",
        select: "name province"
      })
      .populate({
        path: "user",
        select: "name"
      });

    if (!booking || !booking.review || !booking.review.rating || booking.review.isHidden) {
      return res.status(404).json({ success: false, message: "Review not found or has been deleted" });
    }

    const reviewData = {
      _id: booking._id,
      rating: booking.review.rating,
      comment: booking.review.comment,
      isLocked: booking.review.isLocked,
      isHidden: booking.review.isHidden,
      campground: booking.campground,
      user: booking.user
    };

    res.status(200).json({ success: true, data: reviewData });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};



// @desc    Delete Review
// @route   DELETE /api/v1/bookings/:id/review
// @access  Private
exports.deleteReview = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking || !booking.review) {
      return res.status(404).json({
        success: false,
        message: `No Review with the BookingId of ${req.params.id}`,
      });
    }

    if (booking.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to delete this Review`,
      });
    }

    if (req.user.role == "admin") {
      booking.review.adminModified = true;
    }

    booking.review.isHidden = true;
    await booking.save();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Cannot delete Review",
    });
  }
};