const Campground = require('../models/Campground');
const Booking = require('../models/Booking');

const campgrounds = require('./campgrounds');

jest.mock('../models/Campground');
jest.mock('../models/Booking');

describe("Campground Deletion Test", () => {
    
    const sampleId = "abcdefghijklmnopqrstuvwxyz_id";
    const sampleCampground = { _id: sampleId }
    const req = { params: { id: sampleId } }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    const next = jest.fn();
    
    // Clear mock data between tests to prevent test pollution
    afterEach(() => {
        jest.clearAllMocks();
    });
      
    it("should delete a campground and return status 200", async () => {
        Campground.findById.mockResolvedValue(sampleCampground);
        Booking.find.mockResolvedValue([]);
        
        await campgrounds.deleteCampground(req, res, next)
        
        expect(Campground.findById).toHaveBeenCalledWith(sampleId);
        expect(Campground.deleteOne).toHaveBeenCalledWith({ _id: sampleId });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: {} });
    });
    
    it("should prevent campground deletion with valid bookings and return status 400", async () => {
        
    });
    
    it("should return a 404 status if campground not found", async () => {
        
    });
})
