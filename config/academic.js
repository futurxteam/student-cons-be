// Academic constants shared by the User model and controllers.
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

const ACADEMIC_FIELDS = ["department", "course", "batch", "year"];

// Validates and normalises { department, course, batch, year }.
// Checks dynamic relationships with Department, Course, and Batch models if present in DB.
// Returns { value } on success or { error } with a user-facing message.
const validateAcademicDetails = async (body = {}) => {
    const value = {};

    for (const field of ACADEMIC_FIELDS) {
        const raw = body[field];
        if (typeof raw !== "string" || !raw.trim()) {
            const label = field.charAt(0).toUpperCase() + field.slice(1);
            return { error: `${label} is required` };
        }
        value[field] = raw.trim();
    }

    if (!YEARS.includes(value.year)) {
        return { error: `Year must be one of: ${YEARS.join(", ")}` };
    }

    try {
        const Department = require("../models/Department");
        const Course = require("../models/Course");
        const Batch = require("../models/Batch");

        const dept = await Department.findOne({
            name: { $regex: new RegExp(`^${value.department}$`, "i") },
        });

        if (dept) {
            value.department = dept.name;
            value.departmentRef = dept._id;

            const course = await Course.findOne({
                department: dept._id,
                name: { $regex: new RegExp(`^${value.course}$`, "i") },
            });

            if (!course) {
                return {
                    error: `Course "${value.course}" does not belong to department "${dept.name}"`,
                };
            }

            value.course = course.name;
            value.courseRef = course._id;

            if (course.availableYears && course.availableYears.length > 0) {
                if (!course.availableYears.includes(value.year)) {
                    return {
                        error: `"${value.year}" is not an available academic year for ${course.name}. Available years: ${course.availableYears.join(", ")}`,
                    };
                }
            }

            const batchDoc = await Batch.findOne({
                course: course._id,
                name: { $regex: new RegExp(`^${value.batch}$`, "i") },
            });

            if (batchDoc) {
                value.batch = batchDoc.name;
                value.batchRef = batchDoc._id;
            }
        }
    } catch (err) {
        // Fallback gracefully if models are not ready
    }

    return { value };
};

module.exports = { YEARS, ACADEMIC_FIELDS, validateAcademicDetails };
