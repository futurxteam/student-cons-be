const Department = require("../models/Department");
const Course = require("../models/Course");
const Batch = require("../models/Batch");

const defaultAcademicData = [
    {
        name: "Computer Science",
        description: "Department of Computer Science & Applications",
        courses: [
            { name: "MCA", availableYears: ["1st Year", "2nd Year"] },
            { name: "BCA", availableYears: ["1st Year", "2nd Year", "3rd Year"] },
            { name: "B.Tech", availableYears: ["1st Year", "2nd Year", "3rd Year", "4th Year"] },
        ],
    },
    {
        name: "Commerce",
        description: "Department of Commerce & Finance",
        courses: [
            { name: "B.Com", availableYears: ["1st Year", "2nd Year", "3rd Year"] },
        ],
    },
    {
        name: "Management",
        description: "Department of Management Studies",
        courses: [
            { name: "BBA", availableYears: ["1st Year", "2nd Year", "3rd Year"] },
            { name: "MBA", availableYears: ["1st Year", "2nd Year"] },
        ],
    },
    {
        name: "Psychology",
        description: "Department of Behavioral Sciences & Psychology",
        courses: [
            { name: "BA Psychology", availableYears: ["1st Year", "2nd Year", "3rd Year"] },
        ],
    },
    {
        name: "Science",
        description: "Department of Pure & Applied Sciences",
        courses: [
            { name: "M.Sc", availableYears: ["1st Year", "2nd Year"] },
        ],
    },
    {
        name: "Humanities",
        description: "Department of Humanities & Social Sciences",
        courses: [],
    },
];

const initAcademicData = async () => {
    try {
        const deptCount = await Department.countDocuments();
        if (deptCount === 0) {
            console.log("Initializing default departments and courses...");
            for (const deptData of defaultAcademicData) {
                let dept = await Department.findOne({ name: deptData.name });
                if (!dept) {
                    dept = await Department.create({
                        name: deptData.name,
                        description: deptData.description,
                    });
                }

                for (const courseData of deptData.courses) {
                    let course = await Course.findOne({
                        department: dept._id,
                        name: courseData.name,
                    });

                    if (!course) {
                        course = await Course.create({
                            name: courseData.name,
                            department: dept._id,
                            availableYears: courseData.availableYears,
                        });
                    }

                    // Create initial batches for newly initialized courses
                    const existingBatchCount = await Batch.countDocuments({ course: course._id });
                    if (existingBatchCount === 0) {
                        await Batch.create([
                            { name: "2024 Batch", batchYear: "2024", course: course._id, department: dept._id },
                            { name: "2025 Batch", batchYear: "2025", course: course._id, department: dept._id },
                        ]);
                    }
                }
            }
            console.log("Academic departments & courses initialized successfully.");
        }

        // For any existing courses in DB that don't have batches yet, initialize default batches
        const allCourses = await Course.find();
        for (const course of allCourses) {
            const bCount = await Batch.countDocuments({ course: course._id });
            if (bCount === 0) {
                await Batch.create([
                    { name: "2024 Batch", batchYear: "2024", course: course._id, department: course.department },
                    { name: "2025 Batch", batchYear: "2025", course: course._id, department: course.department },
                ]);
            }
        }
    } catch (error) {
        console.error("Academic data initialization warning:", error.message);
    }
};

module.exports = { initAcademicData, defaultAcademicData };
