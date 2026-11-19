const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Batch name is required"],
            trim: true,
        },
        batchYear: {
            type: String,
            trim: true,
            default: function () {
                const match = this.name ? this.name.match(/\d{4}/) : null;
                return match ? match[0] : this.name || "";
            },
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

// Prevent duplicate batch names within the same course
batchSchema.index({ course: 1, name: 1 }, { unique: true });

module.exports =
    mongoose.models.Batch || mongoose.model("Batch", batchSchema);
