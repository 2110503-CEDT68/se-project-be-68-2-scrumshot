const Campground = require('../models/Campground');
const Booking = require('../models/Booking');

const campgrounds = require('../controllers/campgrounds');

jest.mock('../models/Campground');
jest.mock('../models/Booking');

describe("Campground Deletion Test", () => {
    
    const sampleCampgroundId = "campground_id";
    const sampleBookingId = "booking_id";
    const sampleCampground = { _id: sampleCampgroundId }
    const sampleBooking = { _id: sampleBookingId, bookDate: (new Date() - 1), bookEndDate: (new Date() + 1), }
    
    const req = { params: { id: sampleCampgroundId } }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
    const next = jest.fn();
    
    // Clear mock data between tests to prevent test pollution
    afterEach(() => {
        jest.clearAllMocks();
    });
      
    it("should delete a campground and return status 200", async () => {
        Campground.findById.mockResolvedValue(sampleCampground);
        Booking.find.mockResolvedValue([]);
        
        await campgrounds.deleteCampground(req, res, next)
        
        expect(Campground.findById).toHaveBeenCalledWith(sampleCampgroundId);
        expect(Booking.find).toHaveBeenCalled(); // it calls with new Date() which is impossible to do a check.
        expect(Campground.deleteOne).toHaveBeenCalledWith({ _id: sampleCampgroundId });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: {} });
    });
    
    it("should prevent campground deletion with valid bookings and return status 400", async () => {
        Campground.findById.mockResolvedValue(sampleCampground);
        Booking.find.mockResolvedValue([sampleBooking, sampleBooking]);
        
        await campgrounds.deleteCampground(req, res, next)
        
        expect(Campground.findById).toHaveBeenCalledWith(sampleCampgroundId);
        expect(Booking.find).toHaveBeenCalled();
        expect(Campground.deleteOne).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Cannot delete campground with 2 active booking(s). Please cancel all active bookings first." });
    });
    
    it("should return a 404 status if campground not found", async () => {
        Campground.findById.mockResolvedValue(null);
        
        await campgrounds.deleteCampground(req, res, next)
        
        expect(Campground.findById).toHaveBeenCalledWith(sampleCampgroundId);
        expect(Campground.deleteOne).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Campground not found with id of " + sampleCampgroundId });
    });
   
    it("should handle error by returning a 400 status", async () => {
        Campground.findById.mockRejectedValue(new Error("Test error"));
        Booking.find.mockResolvedValue([]);
        
        await campgrounds.deleteCampground(req, res, next)
        
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Test error" });
    });
    
})
