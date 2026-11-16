const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
    {
        adminId: { type: String, required: true, unique: true, trim: true },
        name: { type: String, required: true, trim: true },
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        // bcrypt hash only - plain text passwords are never stored
        password: { type: String, required: true },
        role: { type: String, enum: ["admin"], default: "admin" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);
