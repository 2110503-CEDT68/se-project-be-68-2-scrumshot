const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  bookDate: {
    type: Date,
    required: true,
  },
  bookEndDate: {
    type: Date,
    required: true,
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  campground: {
    type: mongoose.Schema.ObjectId,
    ref: "Campground",
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  review: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    isHidden: {
      type: Boolean,
      default: false,   
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Booking", BookingSchema);
