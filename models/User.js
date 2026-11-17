const mongoose = require("mongoose");

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

        // Student-specific fields
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
            required: isStudent,
        },
        dob: {
            type: String, // YYYY-MM-DD
            required: isStudent,
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
