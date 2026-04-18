const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema({
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
  },
  adminModified: {
    type: Boolean,
    deafult: false,
  },
  isHidden: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

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
    type: ReviewSchema,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Booking", BookingSchema);
