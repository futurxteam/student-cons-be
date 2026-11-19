const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Course name is required"],
            trim: true,
        },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
            required: [true, "Department reference is required"],
        },
        availableYears: {
            type: [String],
            enum: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
            default: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
            validate: {
                validator: function (years) {
                    return Array.isArray(years) && years.length > 0;
                },
                message: "Course must have at least one available year configured",
            },
        },
    },
    { timestamps: true }
);

// Prevent duplicate course names within the same department
courseSchema.index({ department: 1, name: 1 }, { unique: true });

module.exports =
    mongoose.models.Course || mongoose.model("Course", courseSchema);
