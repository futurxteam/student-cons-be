const express = require("express");
const Booking = require("../models/Booking");
const User = require("../models/User");
const { requireStudent } = require("../middleware/auth");

const router = express.Router();

// Create a booking for the logged-in student
router.post("/", requireStudent, async (req, res) => {
    try {
        const { date, time } = req.body;

        if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || !time) {
            return res.status(400).json({ message: "Date and time are required" });
        }

        const student = await User.findOne({ _id: req.user.id, role: "student" });
        if (!student) {
            return res.status(401).json({ message: "Student not found" });
        }

        const taken = await Booking.findOne({ date, time });
        if (taken) {
            return res.status(409).json({ message: "This slot is already booked" });
        }

        const booking = await Booking.create({
            student: student._id,
            rollNumber: student.rollNumber,
            date,
            time,
        });

        res.status(201).json({ message: "Booking confirmed", booking });
    } catch (error) {
        res.status(500).json({ message: "Booking failed" });
    }
});

// Bookings of the logged-in student
router.get("/mine", requireStudent, async (req, res) => {
    try {
        const bookings = await Booking.find({ student: req.user.id }).sort({
            date: -1,
        });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: "Could not load bookings" });
    }
});

module.exports = router;
