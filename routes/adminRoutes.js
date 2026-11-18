
const express = require("express");
const router = express.Router();

const {
    adminLogin,
    getDashboardStats,
    getAllBookings,
    updateBookingStatus,
    getAllStudents,
    getStudentDetails
} = require("../controllers/adminController");

const { requireAdmin } = require("../middleware/auth");


router.post("/login", adminLogin);


router.get("/stats", requireAdmin, getDashboardStats);

router.get("/bookings", requireAdmin, getAllBookings);


router.patch("/bookings/:id/status", requireAdmin, updateBookingStatus);

// All Students
router.get("/students", requireAdmin, getAllStudents);


router.get("/students/:id", requireAdmin, getStudentDetails);

module.exports = router;
