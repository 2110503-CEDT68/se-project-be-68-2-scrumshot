const express = require("express");
const {
  getBookings,
  getBooking,
  addBooking,
  updateBooking,
  deleteBooking,
  getCampgroundReviews,
  getReview,
  updateReview,
  addReview,
  deleteReview,
} = require("../controllers/bookings");

/**
 * @swagger
 * components:
 *   schemas:
 *     Review:
 *       type: object
 *       properties:
 *         rating:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *           description: Rating from 1 to 5
 *         comment:
 *           type: string
 *           description: Review comment
 *         adminModified:
 *           type: boolean
 *           description: Whether the review was modified by an admin
 *         isHidden:
 *           type: boolean
 *           description: Whether the review is hidden
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Review creation date
 *     Booking:
 *       type: object
 *       required:
 *         - bookDate
 *         - bookEndDate
 *         - totalPrice
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: The auto-generated id of the booking
 *         bookDate:
 *           type: string
 *           format: date
 *           description: Start date of the booking
 *         bookEndDate:
 *           type: string
 *           format: date
 *           description: End date of the booking
 *         user:
 *           type: string
 *           format: uuid
 *           description: User ID who made the booking
 *         campground:
 *           type: string
 *           format: uuid
 *           description: Campground ID
 *         totalPrice:
 *           type: number
 *           description: Total price of the booking
 *         review:
 *           $ref: '#/components/schemas/Review'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Booking creation date
 *       example:
 *         id: 609bda561452242d88d36e37
 *         bookDate: "2024-03-01T00:00:00.000Z"
 *         bookEndDate: "2024-03-03T00:00:00.000Z"
 *         user: 609bda561452242d88d36e38
 *         campground: 609bda561452242d88d36e39
 *         totalPrice: 1500
 *         review:
 *           rating: 5
 *           comment: "Great experience!"
 *         createdAt: "2024-03-01T00:00:00.000Z"
 * tags:
 *   name: Bookings
 *   description: The Bookings managing API
 * /bookings:
 *   get:
 *     summary: Returns the list of all bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The list of the bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Booking'
 * /campgrounds/{campgroundId}/bookings:
 *   get:
 *     summary: Returns the list of bookings for a specific campground
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campgroundId
 *         schema:
 *           type: string
 *         required: true
 *         description: The campground id
 *     responses:
 *       200:
 *         description: The list of the bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Booking'
 *   post:
 *     summary: Create a new booking for a campground
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campgroundId
 *         schema:
 *           type: string
 *         required: true
 *         description: The campground id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Booking'
 *     responses:
 *       201:
 *         description: The booking was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 * /bookings/{id}:
 *   get:
 *     summary: Get the booking by id
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The booking id
 *     responses:
 *       200:
 *         description: The booking details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       404:
 *         description: The booking was not found
 *   put:
 *     summary: Update the booking by the id
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The booking id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Booking'
 *     responses:
 *       200:
 *         description: The booking was updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       404:
 *         description: The booking was not found
 *   delete:
 *     summary: Remove the booking by id
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The booking id
 *     responses:
 *       200:
 *         description: The booking was deleted
 *       404:
 *         description: The booking was not found
 * /bookings/{id}/review:
 *   get:
 *     summary: Get the review for a specific booking
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The booking id
 *     responses:
 *       200:
 *         description: The review details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Review'
 *       404:
 *         description: Review not found
 *   post:
 *     summary: Add a review to a booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The booking id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review added successfully
 *       400:
 *         description: Invalid input or review already exists
 *   put:
 *     summary: Update a review
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The booking id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Review updated successfully
 *   delete:
 *     summary: Delete a review
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The booking id
 *     responses:
 *       200:
 *         description: Review deleted successfully
 */

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require("../middleware/auth");

router
  .route("/")
  .get(protect, getBookings)
  .post(protect, authorize("admin", "user"), addBooking);

router
  .route("/:id")
  .get(protect, getBooking)
  .put(protect, authorize("admin", "user"), updateBooking)
  .delete(protect, authorize("admin", "user"), deleteBooking);

router
  .route("/:id/review")
  .get(getReview)
  .put(protect, authorize("admin", "user"), updateReview)
  .post(protect, authorize('admin', 'user'), addReview)
  .delete(protect, authorize("admin", "user"), deleteReview);

module.exports = router;

