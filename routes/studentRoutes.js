
const express = require("express");
const jwt = require("jsonwebtoken");
const Student = require("../models/Student");

const router = express.Router();

// Student Registration
router.post("/register", async (req, res) => {
    try {
        const { rollNumber, name, email, phone, dob } = req.body;

        if (!rollNumber || !name || !email || !phone || !dob) {
            return res.status(400).json({
                message: "Please fill in all fields",
            });
        }

        const existingStudent = await Student.findOne({
            $or: [
                { rollNumber: rollNumber.trim() },
                { email: email.trim().toLowerCase() },
            ],
        });

        if (existingStudent) {
            return res.status(409).json({
                message: "Roll number or email already registered",
            });
        }

        const student = await Student.create({
            rollNumber: rollNumber.trim(),
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            dob,
        });

        res.status(201).json({
            message: "Registration successful",
            student: {
                id: student._id,
                rollNumber: student.rollNumber,
                name: student.name,
                email: student.email,
                phone: student.phone,
                dob: student.dob,
            },
        });
    } catch (error) {
        res.status(500).json({ message: "Registration failed" });
    }
});

// Student Login
router.post("/login", async (req, res) => {
    try {
        const { rollNumber, dob } = req.body;

        const student = await Student.findOne({
            rollNumber: rollNumber?.trim(),
            dob,
        });

        if (!student) {
            return res.status(401).json({
                message: "Invalid roll number or date of birth",
            });
        }

        const token = jwt.sign(
            { id: student._id, role: "student" },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            message: "Login successful",
            token,
            student: {
                id: student._id,
                rollNumber: student.rollNumber,
                name: student.name,
                email: student.email,
                phone: student.phone,
                dob: student.dob,
            },
        });
    } catch (error) {
        res.status(500).json({ message: "Login failed" });
    }
});

module.exports = router;
