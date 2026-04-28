const { createCampground } = require("../controllers/campgrounds");
const Campground = require("../models/Campground");

jest.mock("../models/Campground");

describe("Create campground test", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 if pricePerNight is negative", async () => {
    req.body = {
      name: "Test Camp",
      pricePerNight: -10
    };

    await createCampground(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Price per night must be a positive number"
    });

    expect(Campground.create).not.toHaveBeenCalled();
  });

  it("should create a campground and return 201 for valid data", async () => {
    const mockCampground = {
      _id: "507f1f77bcf86cd799439011",
      name: "Sunny Valley",
      pricePerNight: 50,
      description: "A beautiful valley"
    };

    req.body = {
      name: "Sunny Valley",
      pricePerNight: 50,
      description: "A beautiful valley"
    };

    Campground.create.mockResolvedValue(mockCampground);

    await createCampground(req, res, next);

    expect(Campground.create).toHaveBeenCalledWith(req.body);

    expect(res.status).toHaveBeenCalledWith(201);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockCampground
    });
  });
  
  it("should return 400 if an error occurs with the error message", async () => {
    req.body = {
      name: "Sunny Valley",
      pricePerNight: 50,
      description: "A beautiful valley"
    }

    Campground.create.mockRejectedValue(new Error("Test error"));

    await createCampground(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Test error"
    });
  });
  
});