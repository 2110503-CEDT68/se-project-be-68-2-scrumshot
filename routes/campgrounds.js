const express = require("express");
const {
  getCampgrounds,
  getCampground,
  createCampground,
  updateCampground,
  deleteCampground,
} = require("../controllers/campgrounds");

/**
 * @swagger
 * components:
 *   schemas:
 *     Campground:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - address
 *         - district
 *         - province
 *         - postalcode
 *         - region
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: The auto-generated id of the Campground
 *           example: 609bda561452242d88d36e37
 *         name:
 *           type: string
 *           description: Campground name
 *         description:
 *           type: string
 *           description: Description of the campground
 *         address:
 *           type: string
 *           description: House No., Street, Road
 *         district:
 *           type: string
 *           description: District
 *         province:
 *           type: string
 *           description: Province
 *         postalcode:
 *           type: string
 *           description: 5-digit postal code
 *         tel:
 *           type: string
 *           description: Telephone number
 *         region:
 *           type: string
 *           description: Region
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date the campground was added
 *       example:
 *         id: 609bda561452242d88d36e37
 *         name: Happy Campground
 *         description: A very happy place to camp
 *         address: 121 ถ.สุขุมวิท
 *         district: บางนา
 *         province: กรุงเทพมหานคร
 *         postalcode: 10110
 *         tel: 02-2187000
 *         region: กรุงเทพมหานคร (Bangkok)
 *         createdAt: 2024-03-01T00:00:00.000Z
 * tags:
 *   name: Campgrounds
 *   description: The Campgrounds managing API
 * /campgrounds:
 *   get:
 *     summary: Returns the list of all the Campgrounds
 *     tags: [Campgrounds]
 *     responses:
 *       200:
 *         description: The list of the Campgrounds
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Campground'
 *   post:
 *     summary: Create a new Campground
 *     tags: [Campgrounds]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Campground'
 *     responses:
 *       201:
 *         description: The Campground was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Campground'
 *       500:
 *         description: Some server error
 * /campgrounds/{id}:
 *   get:
 *     summary: Get the Campground by id
 *     tags: [Campgrounds]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The Campground id
 *     responses:
 *       200:
 *         description: The Campground description by id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Campground'
 *       404:
 *         description: The Campground was not found
 *   put:
 *     summary: Update the Campground by the id
 *     tags: [Campgrounds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The Campground id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Campground'
 *     responses:
 *       200:
 *         description: The Campground was updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Campground'
 *       404:
 *         description: The Campground was not found
 *       500:
 *         description: Some error happened
 *   delete:
 *     summary: Remove the Campground by id
 *     tags: [Campgrounds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The Campground id
 *     responses:
 *       200:
 *         description: The Campground was deleted
 *       404:
 *         description: The Campground was not found
 */

const bookingRouter = require("./bookings");

const router = express.Router();

const { protect, authorize } = require("../middleware/auth");

router.use("/:campgroundId/bookings", bookingRouter);

router
  .route("/")
  .get(getCampgrounds)
  .post(protect, authorize("admin"), createCampground);

router
  .route("/:id")
  .get(getCampground)
  .put(protect, authorize("admin"), updateCampground)
  .delete(protect, authorize("admin"), deleteCampground);

module.exports = router;
