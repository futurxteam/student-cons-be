
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// STUDENT REGISTRATION
const registerStudent = async (req, res) => {
    try {
        const { rollNumber, name, email, phone, dob } = req.body;

        if (!rollNumber || !name || !email || !phone || !dob) {
            return res.status(400).json({
                message: "Please fill in all fields",
            });
        }

        const existingStudent = await User.findOne({
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

        const student = await User.create({
            rollNumber: rollNumber.trim(),
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            dob,
            role: "student",
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
        console.error("Registration Error:", error);
        res.status(500).json({
            message: "Registration failed",
        });
    }
};

// STUDENT LOGIN
const loginStudent = async (req, res) => {
    try {
        const { rollNumber, dob } = req.body;

        if (!rollNumber || !dob) {
            return res.status(400).json({
                message: "Roll number and date of birth are required",
            });
        }

        const student = await User.findOne({
            rollNumber: rollNumber.trim(),
            dob,
            role: "student",
        });

        if (!student) {
            return res.status(401).json({
                message: "Invalid roll number or date of birth",
            });
        }

        const token = jwt.sign(
            {
                id: student._id,
                role: "student",
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(200).json({
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
        console.error("Login Error:", error);
        res.status(500).json({
            message: "Login failed",
        });
    }
};

module.exports = {
    registerStudent,
    loginStudent,
};
