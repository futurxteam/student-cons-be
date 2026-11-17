
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("../models/User");
const Booking = require("../models/Booking");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Admin login: username OR email + password
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (
            typeof username !== "string" ||
            typeof password !== "string" ||
            !username.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }

        const identifier = username.trim().toLowerCase();

        const admin = await User.findOne({
            role: "admin",
            $or: [
                { username: identifier },
                { email: identifier },
                { adminId: username.trim().toUpperCase() }
            ]
        }).select("+password");

        const valid =
            admin &&
            typeof admin.password === "string" &&
            (await bcrypt.compare(password, admin.password));

        if (!valid) {
            // Debug info only - never log passwords or hashes
            console.warn(
                `Admin login failed: identifier="${identifier}", ` +
                (admin
                    ? `admin found, hasPasswordHash=${typeof admin.password === "string"}, passwordMatch=false`
                    : "no admin with that username/email")
            );
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

        const token = jwt.sign(
            { id: admin._id, role: "admin" },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            message: "Login successful",
            token,
            admin: {
                id: admin._id,
                adminId: admin.adminId,
                name: admin.name,
                username: admin.username,
                email: admin.email,
                role: admin.role
            }
        });

    } catch (error) {
        console.error("Admin Login Error:", error);

        res.status(500).json({
            message: "Login failed"
        });
    }
});


// Dashboard statistics
router.get("/stats", requireAdmin, async (req, res) => {
    try {
        const [totalStudents, bookings] = await Promise.all([
            User.countDocuments({ role: "student" }),
            Booking.find({}, "date status").lean()
        ]);

        const count = (status) =>
            bookings.filter((booking) => booking.status === status).length;

        // Last 6 months including current month
        const now = new Date();

        const monthly = Array.from({ length: 6 }, (_, i) => {
            const d = new Date(
                now.getFullYear(),
                now.getMonth() - 5 + i,
                1
            );

            const key = `${d.getFullYear()}-${String(
                d.getMonth() + 1
            ).padStart(2, "0")}`;

            const inMonth = bookings.filter(
                (booking) =>
                    typeof booking.date === "string" &&
                    booking.date.startsWith(key)
            );

            return {
                month: key,
                label: d.toLocaleDateString("en-IN", {
                    month: "short"
                }),
                total: inMonth.length,
                attended: inMonth.filter(
                    (b) => b.status === "attended"
                ).length,
                pending: inMonth.filter(
                    (b) => b.status === "pending"
                ).length,
                notAttended: inMonth.filter(
                    (b) => b.status === "not-attended"
                ).length
            };
        });

        res.json({
            totalStudents,
            totalConsultations: bookings.length,
            attended: count("attended"),
            pending: count("pending"),
            notAttended: count("not-attended"),
            monthly
        });

    } catch (error) {
        console.error("Dashboard Stats Error:", error);

        res.status(500).json({
            message: "Could not load statistics"
        });
    }
});


// All bookings with student information
router.get("/bookings", requireAdmin, async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate("student", "name rollNumber")
            .sort({ date: -1, time: 1 });

        res.json(bookings);

    } catch (error) {
        console.error("Booking List Error:", error);

        res.status(500).json({
            message: "Could not load bookings"
        });
    }
});


// Update attendance status
router.patch("/bookings/:id/status", requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;

        if (!["pending", "attended", "not-attended"].includes(status)) {
            return res.status(400).json({
                message: "Invalid status"
            });
        }

        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid booking id"
            });
        }

        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );

        if (!booking) {
            return res.status(404).json({
                message: "Booking not found"
            });
        }

        res.json(booking);

    } catch (error) {
        console.error("Attendance Update Error:", error);

        res.status(500).json({
            message: "Could not update booking"
        });
    }
});


// Complete student list with booking counts
router.get("/students", requireAdmin, async (req, res) => {
    try {
        const [students, counts] = await Promise.all([
            User.find({ role: "student" })
                .sort({ rollNumber: 1 })
                .lean(),

            Booking.aggregate([
                {
                    $group: {
                        _id: "$student",
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        const map = new Map(
            counts.map((c) => [String(c._id), c.count])
        );

        res.json(
            students.map((student) => ({
                ...student,
                bookingCount: map.get(String(student._id)) || 0
            }))
        );

    } catch (error) {
        console.error("Student List Error:", error);

        res.status(500).json({
            message: "Could not load students"
        });
    }
});


// Student details and booking history
router.get("/students/:id", requireAdmin, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid student id"
            });
        }

        const student = await User.findOne({
            _id: req.params.id,
            role: "student"
        }).lean();

        if (!student) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        const bookings = await Booking.find({
            student: student._id
        }).sort({
            date: -1
        });

        res.json({
            student,
            bookings
        });

    } catch (error) {
        console.error("Student Details Error:", error);

        res.status(500).json({
            message: "Could not load student"
        });
    }
});


module.exports = router;
