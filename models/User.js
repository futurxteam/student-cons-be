const mongoose = require("mongoose");
const { YEARS } = require("../config/academic");

const isStudent = function () {
    return this.role === "student";
};

const isAdmin = function () {
    return this.role === "admin";
};

// Unified model: admins and students live in the same "users" collection.
const userSchema = new mongoose.Schema(
    {
        // Common fields
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        role: {
            type: String,
            enum: ["student", "admin"],
            required: true,
        },

        // Student-specific personal details
        rollNumber: {
            type: String,
            trim: true,
            required: isStudent,
            unique: true,
            sparse: true,
        },
        phone: {
            type: String,
            trim: true,
            default: "",
        },
        dob: {
            type: String,
            trim: true,
            default: "",
        },

        // Academic details (string names for fast display & backward compatibility)
        department: {
            type: String,
            trim: true,
            required: isStudent,
        },
        course: {
            type: String,
            trim: true,
            required: isStudent,
        },
        batch: {
            type: String,
            trim: true,
            required: isStudent,
        },
        class: {
            type: String,
            trim: true,
            default: "",
        },
        year: {
            type: String,
            enum: YEARS,
            default: "1st Year",
            required: isStudent,
        },

        // Academic ObjectId references
        departmentRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
        },
        courseRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course",
        },
        batchRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Batch",
        },
        classRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Class",
        },
        departmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
        },
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course",
        },
        batchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Batch",
        },
        classId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Class",
        },

        // Admin-specific fields
        adminId: {
            type: String,
            trim: true,
            required: isAdmin,
            unique: true,
            sparse: true,
        },
        username: {
            type: String,
            trim: true,
            lowercase: true,
            required: isAdmin,
            unique: true,
            sparse: true,
        },
        // bcrypt hash; students have no password
        password: {
            type: String,
            required: isAdmin,
            select: false,
        },
    },
    { timestamps: true, collection: "users" }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
