const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Class name is required"],
            trim: true,
        },
        batch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Batch",
            required: [true, "Batch reference is required"],
        },
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course",
            required: [true, "Course reference is required"],
        },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
            required: [true, "Department reference is required"],
        },
    },
    { timestamps: true }
);

// Prevent duplicate class names within the same batch
classSchema.index({ batch: 1, name: 1 }, { unique: true });

module.exports =
    mongoose.models.Class || mongoose.model("Class", classSchema);
