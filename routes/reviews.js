const express = require("express");
const {
  deleteReview,
} = require("../controllers/reviews");

const router = express.Router();

const { protect, authorize } = require("../middleware/auth");

router
    .route("/:id")
    .delete(protect, authorize("admin", "user"), deleteReview);

module.exports = router;
