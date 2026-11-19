const mongoose = require("mongoose");
const Department = require("../models/Department");
const Course = require("../models/Course");
const Batch = require("../models/Batch");
const Class = require("../models/Class");
const User = require("../models/User");
const Booking = require("../models/Booking");
const { YEARS } = require("../config/academic");

// Helper: Normalize identifier for student query
const getStudentAcademicQuery = (deptName, courseName, batchName) => {
    const q = { role: "student" };
    if (deptName) q.department = deptName;
    if (courseName) q.course = courseName;
    if (batchName) q.batch = batchName;
    return q;
};

// =========================================================================
// 1. PUBLIC ACADEMIC STRUCTURE (for registration & filters)
// Hierarchy: Department -> Course -> Batch -> Class -> Available Years
// =========================================================================
const getPublicAcademicStructure = async (req, res) => {
    try {
        const [departments, courses, batches, classes] = await Promise.all([
            Department.find().sort({ name: 1 }).lean(),
            Course.find().sort({ name: 1 }).lean(),
            Batch.find().sort({ name: 1 }).lean(),
            Class.find().sort({ name: 1 }).lean(),
        ]);

        const structure = departments.map((dept) => {
            const deptCourses = courses
                .filter((c) => c.department.toString() === dept._id.toString())
                .map((c) => {
                    const courseBatches = batches
                        .filter((b) => b.course.toString() === c._id.toString())
                        .map((b) => {
                            const batchClasses = classes
                                .filter((cl) => cl.batch.toString() === b._id.toString())
                                .map((cl) => ({
                                    _id: cl._id,
                                    name: cl.name,
                                }));

                            return {
                                _id: b._id,
                                name: b.name,
                                batchYear: b.batchYear || b.name,
                                classes: batchClasses,
                            };
                        });

                    return {
                        _id: c._id,
                        name: c.name,
                        availableYears: c.availableYears || [],
                        batches: courseBatches,
                    };
                });

            return {
                _id: dept._id,
                name: dept.name,
                description: dept.description || "",
                courses: deptCourses,
            };
        });

        res.json({
            success: true,
            departments: structure,
            allYears: YEARS,
        });
    } catch (error) {
        console.error("Public Academic Structure Error:", error);
        res.status(500).json({
            success: false,
            message: "Could not load academic options",
        });
    }
};

// =========================================================================
// 2. ADMIN DEPARTMENTS & COURSES (Full Hierarchy Tree)
// =========================================================================
const getAdminDepartments = async (req, res) => {
    try {
        const [departments, courses, batches, classes, studentEnrollments] =
            await Promise.all([
                Department.find().sort({ name: 1 }).lean(),
                Course.find().sort({ name: 1 }).lean(),
                Batch.find().sort({ name: 1 }).lean(),
                Class.find().sort({ name: 1 }).lean(),
                User.aggregate([
                    { $match: { role: "student" } },
                    {
                        $group: {
                            _id: {
                                department: "$department",
                                course: "$course",
                                batch: "$batch",
                                class: "$class",
                                classRef: "$classRef",
                            },
                            count: { $sum: 1 },
                        },
                    },
                ]),
            ]);

        // Aggregate counts
        const deptCountMap = new Map();
        const courseCountMap = new Map();
        const batchCountMap = new Map();
        const classCountMap = new Map();

        for (const item of studentEnrollments) {
            const count = item.count;
            const dName = item._id.department;
            const cName = item._id.course;
            const bName = item._id.batch;
            const clName = item._id.class;
            const clRef = item._id.classRef ? String(item._id.classRef) : null;

            if (dName) {
                deptCountMap.set(dName, (deptCountMap.get(dName) || 0) + count);
            }
            if (cName) {
                courseCountMap.set(cName, (courseCountMap.get(cName) || 0) + count);
            }
            if (cName && bName) {
                const key = `${cName}:::${bName}`;
                batchCountMap.set(key, (batchCountMap.get(key) || 0) + count);
            }
            if (clRef) {
                classCountMap.set(clRef, (classCountMap.get(clRef) || 0) + count);
            }
            if (clName) {
                classCountMap.set(clName, (classCountMap.get(clName) || 0) + count);
            }
        }

        const data = departments.map((dept) => {
            const deptCourses = courses
                .filter((c) => c.department.toString() === dept._id.toString())
                .map((c) => {
                    const courseBatches = batches
                        .filter((b) => b.course.toString() === c._id.toString())
                        .map((b) => {
                            const batchClasses = classes
                                .filter((cl) => cl.batch.toString() === b._id.toString())
                                .map((cl) => ({
                                    _id: cl._id,
                                    name: cl.name,
                                    studentCount:
                                        classCountMap.get(String(cl._id)) ||
                                        classCountMap.get(cl.name) ||
                                        0,
                                }));

                            return {
                                _id: b._id,
                                name: b.name,
                                batchYear: b.batchYear || b.name,
                                classCount: batchClasses.length,
                                totalClasses: batchClasses.length,
                                studentCount:
                                    batchCountMap.get(`${c.name}:::${b.name}`) || 0,
                                classes: batchClasses,
                                createdAt: b.createdAt,
                            };
                        });

                    return {
                        _id: c._id,
                        name: c.name,
                        department: c.department,
                        departmentName: dept.name,
                        availableYears: c.availableYears || [],
                        batchCount: courseBatches.length,
                        totalBatches: courseBatches.length,
                        studentCount: courseCountMap.get(c.name) || 0,
                        batches: courseBatches,
                        createdAt: c.createdAt,
                        updatedAt: c.updatedAt,
                    };
                });

            return {
                _id: dept._id,
                name: dept.name,
                description: dept.description || "",
                studentCount: deptCountMap.get(dept.name) || 0,
                courseCount: deptCourses.length,
                totalCourses: deptCourses.length,
                courses: deptCourses,
                createdAt: dept.createdAt,
                updatedAt: dept.updatedAt,
            };
        });

        res.json({
            success: true,
            departments: data,
            allYears: YEARS,
        });
    } catch (error) {
        console.error("Admin Departments Error:", error);
        res.status(500).json({
            success: false,
            message: "Could not load departments",
        });
    }
};

// =========================================================================
// 3. DEPARTMENT CRUD
// =========================================================================
const createDepartment = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ message: "Department name is required" });
        }

        const trimmedName = name.trim();
        const existing = await Department.findOne({
            name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
        });

        if (existing) {
            return res.status(409).json({
                message: `Department "${trimmedName}" already exists`,
            });
        }

        const department = await Department.create({
            name: trimmedName,
            description: typeof description === "string" ? description.trim() : "",
        });

        res.status(201).json({
            message: "Department created successfully",
            department: {
                ...department.toObject(),
                courses: [],
                studentCount: 0,
            },
        });
    } catch (error) {
        console.error("Create Department Error:", error);
        res.status(500).json({ message: error.message || "Could not create department" });
    }
};

const updateDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid department id" });
        }

        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ message: "Department name is required" });
        }

        const trimmedName = name.trim();
        const department = await Department.findById(id);
        if (!department) {
            return res.status(404).json({ message: "Department not found" });
        }

        const duplicate = await Department.findOne({
            _id: { $ne: id },
            name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
        });

        if (duplicate) {
            return res.status(409).json({
                message: `Another department with the name "${trimmedName}" already exists`,
            });
        }

        const oldName = department.name;
        department.name = trimmedName;
        if (typeof description === "string") {
            department.description = description.trim();
        }
        await department.save();

        if (oldName !== trimmedName) {
            await User.updateMany(
                { role: "student", department: oldName },
                { $set: { department: trimmedName } }
            );
        }

        res.json({
            message: "Department updated successfully",
            department,
        });
    } catch (error) {
        console.error("Update Department Error:", error);
        res.status(500).json({ message: error.message || "Could not update department" });
    }
};

const getDepartmentDetails = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid department id" });
        }

        const department = await Department.findById(id).lean();
        if (!department) {
            return res.status(404).json({ message: "Department not found" });
        }

        const courses = await Course.find({ department: id }).sort({ name: 1 }).lean();
        const courseIds = courses.map((c) => c._id);
        const batches = await Batch.find({ course: { $in: courseIds } }).lean();

        // Calculate student enrollments for these courses
        const studentEnrollments = await User.aggregate([
            {
                $match: {
                    role: "student",
                    $or: [
                        { departmentRef: department._id },
                        { department: department.name },
                    ],
                },
            },
            {
                $group: {
                    _id: {
                        course: "$course",
                        courseRef: "$courseRef",
                        batch: "$batch",
                        batchRef: "$batchRef",
                    },
                    count: { $sum: 1 },
                },
            },
        ]);

        const courseCountMap = new Map();
        const batchCountMap = new Map();
        let totalStudents = 0;

        for (const item of studentEnrollments) {
            const count = item.count;
            totalStudents += count;

            const cName = item._id.course;
            const cRef = item._id.courseRef ? String(item._id.courseRef) : null;
            if (cRef) {
                courseCountMap.set(cRef, (courseCountMap.get(cRef) || 0) + count);
            } else if (cName) {
                courseCountMap.set(cName, (courseCountMap.get(cName) || 0) + count);
            }

            const bRef = item._id.batchRef ? String(item._id.batchRef) : null;
            const bName = item._id.batch;
            if (bRef) {
                batchCountMap.set(bRef, (batchCountMap.get(bRef) || 0) + count);
            } else if (cName && bName) {
                batchCountMap.set(`${cName}:::${bName}`, (batchCountMap.get(`${cName}:::${bName}`) || 0) + count);
            }
        }

        const coursesWithData = courses.map((course) => {
            const courseBatches = batches.filter(
                (b) => b.course.toString() === course._id.toString()
            );
            const studentCount =
                courseCountMap.get(String(course._id)) ||
                courseCountMap.get(course.name) ||
                0;

            return {
                _id: course._id,
                name: course.name,
                department: course.department,
                departmentName: department.name,
                availableYears: course.availableYears || [],
                totalBatches: courseBatches.length,
                batchCount: courseBatches.length,
                totalStudents: studentCount,
                studentCount: studentCount,
                batches: courseBatches.map((b) => ({
                    _id: b._id,
                    name: b.name,
                    batchYear: b.batchYear || b.name,
                    studentCount:
                        batchCountMap.get(String(b._id)) ||
                        batchCountMap.get(`${course.name}:::${b.name}`) ||
                        0,
                })),
                createdAt: course.createdAt,
                updatedAt: course.updatedAt,
            };
        });

        res.json({
            success: true,
            department: {
                _id: department._id,
                name: department.name,
                description: department.description || "",
                courseCount: courses.length,
                totalCourses: courses.length,
                totalBatches: batches.length,
                totalStudents,
                studentCount: totalStudents,
                courses: coursesWithData,
                createdAt: department.createdAt,
                updatedAt: department.updatedAt,
            },
        });
    } catch (error) {
        console.error("Get Department Details Error:", error);
        res.status(500).json({ message: "Could not load department details" });
    }
};

const deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid department id" });
        }

        const department = await Department.findById(id);
        if (!department) {
            return res.status(404).json({ message: "Department not found" });
        }

        const [courseCount, studentCount] = await Promise.all([
            Course.countDocuments({ department: id }),
            User.countDocuments({
                role: "student",
                $or: [{ departmentRef: id }, { department: department.name }],
            }),
        ]);

        if (courseCount > 0) {
            return res.status(400).json({
                message: `Cannot delete department "${department.name}": It contains ${courseCount} course(s). Please delete these courses first.`,
                courseCount,
                studentCount,
            });
        }

        if (studentCount > 0) {
            return res.status(400).json({
                message: `Cannot delete department "${department.name}": ${studentCount} student(s) are currently enrolled in it. Please update or reassign these students first.`,
                studentCount,
            });
        }

        await Department.findByIdAndDelete(id);

        res.json({
            message: `Department "${department.name}" was deleted successfully`,
        });
    } catch (error) {
        console.error("Delete Department Error:", error);
        res.status(500).json({ message: error.message || "Could not delete department" });
    }
};

// =========================================================================
// 4. COURSE MANAGEMENT & DETAILS
// =========================================================================
const getCourseDetails = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid course id" });
        }

        const course = await Course.findById(id).populate("department", "name description").lean();
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        const [batches, classes, batchStudentCounts, totalStudents] = await Promise.all([
            Batch.find({ course: id }).sort({ name: 1 }).lean(),
            Class.find({ course: id }).lean(),
            User.aggregate([
                {
                    $match: {
                        role: "student",
                        $or: [{ courseRef: course._id }, { course: course.name }],
                    },
                },
                {
                    $group: {
                        _id: "$batch",
                        count: { $sum: 1 },
                    },
                },
            ]),
            User.countDocuments({
                role: "student",
                $or: [{ courseRef: course._id }, { course: course.name }],
            }),
        ]);

        const batchCountMap = new Map();
        for (const item of batchStudentCounts) {
            if (item._id) batchCountMap.set(item._id, item.count);
        }

        const batchesWithCounts = batches.map((b) => {
            const bClasses = classes.filter(
                (cl) => cl.batch.toString() === b._id.toString()
            );
            return {
                ...b,
                classCount: bClasses.length,
                totalClasses: bClasses.length,
                studentCount: batchCountMap.get(b.name) || 0,
            };
        });

        res.json({
            success: true,
            course: {
                _id: course._id,
                name: course.name,
                department: course.department,
                availableYears: course.availableYears || [],
                totalBatches: batches.length,
                totalStudents,
                batches: batchesWithCounts,
                createdAt: course.createdAt,
            },
        });
    } catch (error) {
        console.error("Get Course Details Error:", error);
        res.status(500).json({ message: "Could not load course details" });
    }
};

const addCourse = async (req, res) => {
    try {
        const { id } = req.params; // department id
        const { name, availableYears } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid department id" });
        }

        const department = await Department.findById(id);
        if (!department) {
            return res.status(404).json({ message: "Department not found" });
        }

        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ message: "Course name is required" });
        }

        const trimmedName = name.trim();
        const duplicate = await Course.findOne({
            department: id,
            name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
        });

        if (duplicate) {
            return res.status(409).json({
                message: `Course "${trimmedName}" already exists in ${department.name}`,
            });
        }

        let years = availableYears;
        if (!Array.isArray(years) || years.length === 0) {
            years = YEARS;
        } else {
            years = years.filter((y) => YEARS.includes(y));
            if (years.length === 0) {
                return res.status(400).json({
                    message: "Course must have at least one valid academic year selected",
                });
            }
        }

        const course = await Course.create({
            name: trimmedName,
            department: id,
            availableYears: years,
        });

        // Automatically create a default 2024 batch for this new course
        const defaultBatch = await Batch.create({
            name: "2024 Batch",
            batchYear: "2024",
            course: course._id,
            department: department._id,
        });

        res.status(201).json({
            message: "Course created successfully",
            course: {
                ...course.toObject(),
                departmentName: department.name,
                batchCount: 1,
                studentCount: 0,
                batches: [{ ...defaultBatch.toObject(), studentCount: 0 }],
            },
        });
    } catch (error) {
        console.error("Add Course Error:", error);
        res.status(500).json({ message: error.message || "Could not add course" });
    }
};

const updateCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, availableYears } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid course id" });
        }

        const course = await Course.findById(id);
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        if (name && typeof name === "string" && name.trim()) {
            const trimmedName = name.trim();
            if (trimmedName.toLowerCase() !== course.name.toLowerCase()) {
                const duplicate = await Course.findOne({
                    _id: { $ne: id },
                    department: course.department,
                    name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
                });

                if (duplicate) {
                    return res.status(409).json({
                        message: `Another course with name "${trimmedName}" already exists in this department`,
                    });
                }

                const oldName = course.name;
                course.name = trimmedName;

                await User.updateMany(
                    { role: "student", course: oldName },
                    { $set: { course: trimmedName } }
                );
            }
        }

        if (Array.isArray(availableYears)) {
            const validYears = availableYears.filter((y) => YEARS.includes(y));
            if (validYears.length === 0) {
                return res.status(400).json({
                    message: "Course must have at least one valid academic year configured",
                });
            }
            course.availableYears = validYears;
        }

        await course.save();

        res.json({
            message: "Course updated successfully",
            course,
        });
    } catch (error) {
        console.error("Update Course Error:", error);
        res.status(500).json({ message: error.message || "Could not update course" });
    }
};

const deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid course id" });
        }

        const course = await Course.findById(id);
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        const [batchCount, studentCount] = await Promise.all([
            Batch.countDocuments({ course: id }),
            User.countDocuments({
                role: "student",
                $or: [{ courseRef: id }, { course: course.name }],
            }),
        ]);

        if (batchCount > 0) {
            return res.status(400).json({
                message: `Cannot delete course "${course.name}": It contains ${batchCount} batch(es). Please delete these batches first.`,
                batchCount,
                studentCount,
            });
        }

        if (studentCount > 0) {
            return res.status(400).json({
                message: `Cannot delete course "${course.name}": ${studentCount} student(s) are currently enrolled in it. Please update or reassign these students first.`,
                studentCount,
            });
        }

        await Course.findByIdAndDelete(id);

        res.json({
            message: `Course "${course.name}" and its batches were deleted successfully`,
        });
    } catch (error) {
        console.error("Delete Course Error:", error);
        res.status(500).json({ message: error.message || "Could not delete course" });
    }
};

// =========================================================================
// 5. BATCH MANAGEMENT
// =========================================================================
const createBatch = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { name, batchYear } = req.body;

        if (!mongoose.isValidObjectId(courseId)) {
            return res.status(400).json({ message: "Invalid course id" });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ message: "Batch name is required" });
        }

        const trimmedName = name.trim();
        const duplicate = await Batch.findOne({
            course: courseId,
            name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
        });

        if (duplicate) {
            return res.status(409).json({
                message: `Batch "${trimmedName}" already exists in ${course.name}`,
            });
        }

        const batch = await Batch.create({
            name: trimmedName,
            batchYear:
                typeof batchYear === "string" && batchYear.trim()
                    ? batchYear.trim()
                    : trimmedName.match(/\d{4}/)?.[0] || trimmedName,
            course: courseId,
            department: course.department,
        });

        res.status(201).json({
            message: "Batch created successfully",
            batch: {
                ...batch.toObject(),
                studentCount: 0,
            },
        });
    } catch (error) {
        console.error("Create Batch Error:", error);
        res.status(500).json({ message: error.message || "Could not create batch" });
    }
};

const getBatchDetails = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid batch id" });
        }

        const batch = await Batch.findById(id)
            .populate("course", "name availableYears department")
            .populate("department", "name")
            .lean();

        if (!batch) {
            return res.status(404).json({ message: "Batch not found" });
        }

        const [classes, studentEnrollments, totalStudents] = await Promise.all([
            Class.find({ batch: id }).sort({ name: 1 }).lean(),
            User.aggregate([
                {
                    $match: {
                        role: "student",
                        $or: [
                            { batchRef: batch._id },
                            { batch: batch.name, course: batch.course?.name },
                        ],
                    },
                },
                {
                    $group: {
                        _id: {
                            class: "$class",
                            classRef: "$classRef",
                        },
                        count: { $sum: 1 },
                    },
                },
            ]),
            User.countDocuments({
                role: "student",
                $or: [
                    { batchRef: batch._id },
                    {
                        batch: batch.name,
                        course: batch.course?.name,
                    },
                ],
            }),
        ]);

        const classCountMap = new Map();
        for (const item of studentEnrollments) {
            if (item._id.classRef) {
                classCountMap.set(String(item._id.classRef), item.count);
            }
            if (item._id.class) {
                classCountMap.set(
                    item._id.class,
                    (classCountMap.get(item._id.class) || 0) + item.count
                );
            }
        }

        const classesWithCounts = classes.map((cl) => ({
            ...cl,
            batchName: batch.name,
            courseName: batch.course?.name,
            departmentName: batch.department?.name,
            studentCount:
                classCountMap.get(String(cl._id)) ||
                classCountMap.get(cl.name) ||
                0,
        }));

        res.json({
            success: true,
            batch: {
                ...batch,
                totalClasses: classes.length,
                totalStudents,
                classes: classesWithCounts,
            },
        });
    } catch (error) {
        console.error("Get Batch Details Error:", error);
        res.status(500).json({ message: "Could not load batch details" });
    }
};

const updateBatch = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, batchYear } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid batch id" });
        }

        const batch = await Batch.findById(id).populate("course", "name");
        if (!batch) {
            return res.status(404).json({ message: "Batch not found" });
        }

        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ message: "Batch name is required" });
        }

        const trimmedName = name.trim();
        const duplicate = await Batch.findOne({
            _id: { $ne: id },
            course: batch.course._id,
            name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
        });

        if (duplicate) {
            return res.status(409).json({
                message: `Another batch with name "${trimmedName}" already exists in this course`,
            });
        }

        const oldName = batch.name;
        batch.name = trimmedName;
        if (typeof batchYear === "string" && batchYear.trim()) {
            batch.batchYear = batchYear.trim();
        }
        await batch.save();

        if (oldName !== trimmedName) {
            await User.updateMany(
                {
                    role: "student",
                    $or: [
                        { batchRef: batch._id },
                        { batch: oldName, course: batch.course.name },
                    ],
                },
                { $set: { batch: trimmedName } }
            );
        }

        res.json({
            message: "Batch updated successfully",
            batch,
        });
    } catch (error) {
        console.error("Update Batch Error:", error);
        res.status(500).json({ message: error.message || "Could not update batch" });
    }
};

const deleteBatch = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid batch id" });
        }

        const batch = await Batch.findById(id).populate("course", "name");
        if (!batch) {
            return res.status(404).json({ message: "Batch not found" });
        }

        const [classCount, studentCount] = await Promise.all([
            Class.countDocuments({ batch: id }),
            User.countDocuments({
                role: "student",
                $or: [
                    { batchRef: batch._id },
                    { batch: batch.name, course: batch.course?.name },
                ],
            }),
        ]);

        if (classCount > 0) {
            return res.status(400).json({
                message: `Cannot delete batch "${batch.name}": It contains ${classCount} class(es). Please delete these classes first.`,
                classCount,
                studentCount,
            });
        }

        if (studentCount > 0) {
            return res.status(400).json({
                message: `Cannot delete batch "${batch.name}": ${studentCount} student(s) are currently enrolled in it. Please update or reassign these students first.`,
                studentCount,
            });
        }

        await Batch.findByIdAndDelete(id);

        res.json({
            message: `Batch "${batch.name}" was deleted successfully`,
        });
    } catch (error) {
        console.error("Delete Batch Error:", error);
        res.status(500).json({ message: error.message || "Could not delete batch" });
    }
};

// =========================================================================
// 6. CLASS MANAGEMENT (Level 4: Class inside Batch)
// =========================================================================
const createClass = async (req, res) => {
    try {
        const { batchId } = req.params;
        const { name } = req.body;

        if (!mongoose.isValidObjectId(batchId)) {
            return res.status(400).json({ message: "Invalid batch id" });
        }

        const batch = await Batch.findById(batchId)
            .populate("course", "name department")
            .populate("department", "name");

        if (!batch) {
            return res.status(404).json({ message: "Batch not found" });
        }

        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ message: "Class name is required" });
        }

        const trimmedName = name.trim();
        const duplicate = await Class.findOne({
            batch: batchId,
            name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
        });

        if (duplicate) {
            return res.status(409).json({
                message: `Class "${trimmedName}" already exists in ${batch.name}`,
            });
        }

        const courseId = batch.course?._id || batch.course;
        const deptId = batch.department?._id || batch.department;

        const newClass = await Class.create({
            name: trimmedName,
            batch: batch._id,
            course: courseId,
            department: deptId,
        });

        res.status(201).json({
            message: "Class created successfully",
            class: {
                ...newClass.toObject(),
                studentCount: 0,
            },
        });
    } catch (error) {
        console.error("Create Class Error:", error);
        res.status(500).json({ message: error.message || "Could not create class" });
    }
};

const getClassDetails = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid class id" });
        }

        const classDoc = await Class.findById(id)
            .populate("batch", "name batchYear course department")
            .populate("course", "name availableYears department")
            .populate("department", "name")
            .lean();

        if (!classDoc) {
            return res.status(404).json({ message: "Class not found" });
        }

        const studentCount = await User.countDocuments({
            role: "student",
            $or: [
                { classRef: classDoc._id },
                { class: classDoc.name, batchRef: classDoc.batch?._id || classDoc.batch },
            ],
        });

        res.json({
            success: true,
            class: {
                ...classDoc,
                totalStudents: studentCount,
                studentCount,
            },
        });
    } catch (error) {
        console.error("Get Class Details Error:", error);
        res.status(500).json({ message: "Could not load class details" });
    }
};

const updateClass = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid class id" });
        }

        const classDoc = await Class.findById(id).populate("batch", "name");
        if (!classDoc) {
            return res.status(404).json({ message: "Class not found" });
        }

        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ message: "Class name is required" });
        }

        const trimmedName = name.trim();
        const duplicate = await Class.findOne({
            _id: { $ne: id },
            batch: classDoc.batch._id,
            name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
        });

        if (duplicate) {
            return res.status(409).json({
                message: `Another class with name "${trimmedName}" already exists in this batch`,
            });
        }

        const oldName = classDoc.name;
        classDoc.name = trimmedName;
        await classDoc.save();

        if (oldName !== trimmedName) {
            await User.updateMany(
                {
                    role: "student",
                    $or: [
                        { classRef: classDoc._id },
                        { class: oldName, batchRef: classDoc.batch._id },
                    ],
                },
                { $set: { class: trimmedName } }
            );
        }

        res.json({
            message: "Class updated successfully",
            class: classDoc,
        });
    } catch (error) {
        console.error("Update Class Error:", error);
        res.status(500).json({ message: error.message || "Could not update class" });
    }
};

const deleteClass = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid class id" });
        }

        const classDoc = await Class.findById(id).populate("batch", "name");
        if (!classDoc) {
            return res.status(404).json({ message: "Class not found" });
        }

        const studentCount = await User.countDocuments({
            role: "student",
            $or: [
                { classRef: classDoc._id },
                { class: classDoc.name, batchRef: classDoc.batch?._id || classDoc.batch },
            ],
        });

        if (studentCount > 0) {
            return res.status(400).json({
                message: `Cannot delete class "${classDoc.name}": ${studentCount} student(s) are currently enrolled in it. Please update or reassign these students first.`,
                studentCount,
            });
        }

        await Class.findByIdAndDelete(id);

        res.json({
            message: `Class "${classDoc.name}" was deleted successfully`,
        });
    } catch (error) {
        console.error("Delete Class Error:", error);
        res.status(500).json({ message: error.message || "Could not delete class" });
    }
};

const getClassStudents = async (req, res) => {
    try {
        const { id } = req.params;
        const { search } = req.query;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid class id" });
        }

        const classDoc = await Class.findById(id)
            .populate("batch", "name batchYear course department")
            .populate("course", "name availableYears department")
            .populate("department", "name")
            .lean();

        if (!classDoc) {
            return res.status(404).json({ message: "Class not found" });
        }

        const query = {
            role: "student",
            $or: [
                { classRef: classDoc._id },
                { class: classDoc.name, batchRef: classDoc.batch?._id || classDoc.batch },
            ],
        };

        if (search && typeof search === "string" && search.trim()) {
            const term = search.trim();
            query.$and = [
                {
                    $or: [
                        { rollNumber: { $regex: term, $options: "i" } },
                        { name: { $regex: term, $options: "i" } },
                        { email: { $regex: term, $options: "i" } },
                        { phone: { $regex: term, $options: "i" } },
                    ],
                },
            ];
        }

        const students = await User.find(query)
            .select("rollNumber name email phone dob department course batch class year createdAt")
            .sort({ rollNumber: 1 })
            .lean();

        // Attach booking counts
        const studentIds = students.map((s) => s._id);
        const bookingCounts = await Booking.aggregate([
            { $match: { student: { $in: studentIds } } },
            { $group: { _id: "$student", count: { $sum: 1 } } },
        ]);

        const countMap = new Map(bookingCounts.map((b) => [String(b._id), b.count]));
        const studentsWithCounts = students.map((s) => ({
            ...s,
            bookingCount: countMap.get(String(s._id)) || 0,
        }));

        res.json({
            success: true,
            class: classDoc,
            totalStudents: students.length,
            students: studentsWithCounts,
        });
    } catch (error) {
        console.error("Get Class Students Error:", error);
        res.status(500).json({ message: "Could not load class students" });
    }
};

const addStudentToClass = async (req, res) => {
    try {
        const { id } = req.params; // class id
        const { rollNumber, name, email, year, phone, dob } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid class id" });
        }

        const classDoc = await Class.findById(id)
            .populate("batch", "name batchYear course department")
            .populate("course", "name availableYears department")
            .populate("department", "name");

        if (!classDoc) {
            return res.status(404).json({ message: "Class not found" });
        }

        // Required fields: Roll Number, Name, Email
        if (!rollNumber || typeof rollNumber !== "string" || !rollNumber.trim()) {
            return res.status(400).json({ message: "Roll Number is required" });
        }
        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ message: "Student Name is required" });
        }
        if (!email || typeof email !== "string" || !email.trim()) {
            return res.status(400).json({ message: "Email Address is required" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const trimmedEmail = email.trim().toLowerCase();
        if (!emailRegex.test(trimmedEmail)) {
            return res.status(400).json({ message: "Invalid email address format" });
        }

        const trimmedRoll = rollNumber.trim().toUpperCase();

        // Check for duplicates
        const existingStudent = await User.findOne({
            $or: [{ rollNumber: trimmedRoll }, { email: trimmedEmail }],
        });

        if (existingStudent) {
            if (existingStudent.rollNumber === trimmedRoll) {
                return res.status(409).json({
                    message: `Roll number "${trimmedRoll}" is already registered`,
                });
            }
            return res.status(409).json({
                message: `Email "${trimmedEmail}" is already registered`,
            });
        }

        // Inherit department, course, batch, class from the active context
        const deptName = classDoc.department?.name || "";
        const courseName = classDoc.course?.name || "";
        const batchName = classDoc.batch?.name || "";
        const className = classDoc.name;

        const deptId = classDoc.department?._id || classDoc.department;
        const courseId = classDoc.course?._id || classDoc.course;
        const batchId = classDoc.batch?._id || classDoc.batch;
        const classId = classDoc._id;

        const availableYears = classDoc.course?.availableYears || YEARS;
        let selectedYear = year;
        if (!selectedYear || !availableYears.includes(selectedYear)) {
            selectedYear = availableYears[0] || "1st Year";
        }

        const student = await User.create({
            rollNumber: trimmedRoll,
            name: name.trim(),
            email: trimmedEmail,
            phone: typeof phone === "string" ? phone.trim() : "",
            dob: typeof dob === "string" && dob.trim() ? dob.trim() : "",
            department: deptName,
            course: courseName,
            batch: batchName,
            class: className,
            year: selectedYear,
            departmentRef: deptId,
            courseRef: courseId,
            batchRef: batchId,
            classRef: classId,
            departmentId: deptId,
            courseId: courseId,
            batchId: batchId,
            classId: classId,
            role: "student",
        });

        const newStudentObj = {
            _id: student._id,
            rollNumber: student.rollNumber,
            name: student.name,
            email: student.email,
            phone: student.phone,
            dob: student.dob,
            department: student.department,
            course: student.course,
            batch: student.batch,
            class: student.class,
            year: student.year,
            departmentRef: student.departmentRef,
            courseRef: student.courseRef,
            batchRef: student.batchRef,
            classRef: student.classRef,
            bookingCount: 0,
            createdAt: student.createdAt,
        };

        res.status(201).json({
            message: `Student "${student.name}" enrolled into ${classDoc.name} successfully`,
            student: newStudentObj,
        });
    } catch (error) {
        console.error("Add Student To Class Error:", error);
        if (error.code === 11000) {
            return res.status(409).json({
                message: "A student with this roll number or email already exists",
            });
        }
        res.status(500).json({ message: error.message || "Could not add student" });
    }
};

// =========================================================================
// 7. BATCH STUDENTS (Legacy / Batch level)
// =========================================================================
const getBatchStudents = async (req, res) => {
    try {
        const { id } = req.params;
        const { search } = req.query;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid batch id" });
        }

        const batch = await Batch.findById(id)
            .populate("course", "name availableYears")
            .populate("department", "name")
            .lean();

        if (!batch) {
            return res.status(404).json({ message: "Batch not found" });
        }

        const query = {
            role: "student",
            $or: [
                { batchRef: batch._id },
                { batch: batch.name, course: batch.course?.name },
            ],
        };

        if (search && typeof search === "string" && search.trim()) {
            const term = search.trim();
            query.$and = [
                {
                    $or: [
                        { rollNumber: { $regex: term, $options: "i" } },
                        { name: { $regex: term, $options: "i" } },
                        { email: { $regex: term, $options: "i" } },
                    ],
                },
            ];
        }

        const students = await User.find(query)
            .select("rollNumber name email phone dob department course batch year createdAt")
            .sort({ rollNumber: 1 })
            .lean();

        // Attach booking counts
        const studentIds = students.map((s) => s._id);
        const bookingCounts = await Booking.aggregate([
            { $match: { student: { $in: studentIds } } },
            { $group: { _id: "$student", count: { $sum: 1 } } },
        ]);

        const countMap = new Map(bookingCounts.map((b) => [String(b._id), b.count]));
        const studentsWithCounts = students.map((s) => ({
            ...s,
            bookingCount: countMap.get(String(s._id)) || 0,
        }));

        res.json({
            success: true,
            batch: {
                _id: batch._id,
                name: batch.name,
                batchYear: batch.batchYear,
                course: batch.course,
                department: batch.department,
            },
            totalStudents: students.length,
            students: studentsWithCounts,
        });
    } catch (error) {
        console.error("Get Batch Students Error:", error);
        res.status(500).json({ message: "Could not load batch students" });
    }
};

const addStudentToBatch = async (req, res) => {
    try {
        const { id } = req.params; // batch id
        const { rollNumber, name, email, year, phone, dob } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid batch id" });
        }

        const batch = await Batch.findById(id)
            .populate("course", "name availableYears department")
            .populate("department", "name");

        if (!batch) {
            return res.status(404).json({ message: "Batch not found" });
        }

        // Required fields: Roll Number, Name, Email
        if (!rollNumber || typeof rollNumber !== "string" || !rollNumber.trim()) {
            return res.status(400).json({ message: "Roll Number is required" });
        }
        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ message: "Student Name is required" });
        }
        if (!email || typeof email !== "string" || !email.trim()) {
            return res.status(400).json({ message: "Email Address is required" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const trimmedEmail = email.trim().toLowerCase();
        if (!emailRegex.test(trimmedEmail)) {
            return res.status(400).json({ message: "Invalid email address format" });
        }

        const trimmedRoll = rollNumber.trim().toUpperCase();

        // Check for duplicates
        const existingStudent = await User.findOne({
            $or: [{ rollNumber: trimmedRoll }, { email: trimmedEmail }],
        });

        if (existingStudent) {
            if (existingStudent.rollNumber === trimmedRoll) {
                return res.status(409).json({
                    message: `Roll number "${trimmedRoll}" is already registered`,
                });
            }
            return res.status(409).json({
                message: `Email "${trimmedEmail}" is already registered`,
            });
        }

        // Inherit department, course, and batch from the active context
        const deptName = batch.department?.name || "";
        const courseName = batch.course?.name || "";
        const batchName = batch.name;

        // Determine academic year (must be one of course's availableYears)
        const availableYears = batch.course?.availableYears || YEARS;
        let selectedYear = year;
        if (!selectedYear || !availableYears.includes(selectedYear)) {
            selectedYear = availableYears[0] || "1st Year";
        }

        const deptId = batch.department?._id || batch.department;
        const courseId = batch.course?._id || batch.course;
        const batchId = batch._id;

        const student = await User.create({
            rollNumber: trimmedRoll,
            name: name.trim(),
            email: trimmedEmail,
            phone: typeof phone === "string" ? phone.trim() : "",
            dob: typeof dob === "string" && dob.trim() ? dob.trim() : "",
            department: deptName,
            course: courseName,
            batch: batchName,
            year: selectedYear,
            departmentRef: deptId,
            courseRef: courseId,
            batchRef: batchId,
            departmentId: deptId,
            courseId: courseId,
            batchId: batchId,
            role: "student",
        });

        const newStudentObj = {
            _id: student._id,
            rollNumber: student.rollNumber,
            name: student.name,
            email: student.email,
            phone: student.phone,
            dob: student.dob,
            department: student.department,
            course: student.course,
            batch: student.batch,
            year: student.year,
            departmentRef: student.departmentRef,
            courseRef: student.courseRef,
            batchRef: student.batchRef,
            bookingCount: 0,
            createdAt: student.createdAt,
        };

        res.status(201).json({
            message: "Student added successfully",
            student: newStudentObj,
        });
    } catch (error) {
        console.error("Add Student To Batch Error:", error);
        if (error.code === 11000) {
            return res.status(409).json({
                message: "A student with this roll number or email already exists",
            });
        }
        res.status(500).json({ message: error.message || "Could not add student" });
    }
};

const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid student id" });
        }

        const student = await User.findOne({ _id: id, role: "student" });
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Delete associated bookings
        await Booking.deleteMany({ student: student._id });

        // Delete student
        await User.findByIdAndDelete(id);

        res.json({
            message: `Student "${student.name}" (${student.rollNumber}) was deleted successfully`,
        });
    } catch (error) {
        console.error("Delete Student Error:", error);
        res.status(500).json({ message: "Could not delete student" });
    }
};

module.exports = {
    getPublicAcademicStructure,
    getAdminDepartments,
    getDepartmentDetails,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getCourseDetails,
    addCourse,
    updateCourse,
    deleteCourse,
    createBatch,
    getBatchDetails,
    updateBatch,
    deleteBatch,
    createClass,
    getClassDetails,
    updateClass,
    deleteClass,
    getClassStudents,
    addStudentToClass,
    getBatchStudents,
    addStudentToBatch,
    deleteStudent,
};
