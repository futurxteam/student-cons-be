const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true,
        },
        rollNumber: { type: String, required: true, trim: true },
        date: { type: String, required: true }, // YYYY-MM-DD
        time: { type: String, required: true },
        status: {
            type: String,
            enum: ["pending", "attended", "not-attended"],
            default: "pending",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
