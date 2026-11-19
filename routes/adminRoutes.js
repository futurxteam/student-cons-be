const express = require("express");
const router = express.Router();

const {
    adminLogin,
    getDashboardStats,
    getAllBookings,
    updateBookingStatus,
    getAllStudents,
    getStudentDetails,
    getDepartmentStats,
    getCourseStats,
    getBatchStats,
    updateStudentDetails,
} = require("../controllers/adminController");

const {
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
} = require("../controllers/departmentController");

const { requireAdmin } = require("../middleware/auth");

// Admin Login
router.post("/login", adminLogin);

// Dashboard Statistics
router.get("/stats", requireAdmin, getDashboardStats);

// Booking Management
router.get("/bookings", requireAdmin, getAllBookings);
router.patch(
    "/bookings/:id/status",
    requireAdmin,
    updateBookingStatus
);

// Student Management (Global)
router.get("/students", requireAdmin, getAllStudents);
router.get("/students/:id", requireAdmin, getStudentDetails);
router.patch("/students/:id", requireAdmin, updateStudentDetails);
router.delete("/students/:id", requireAdmin, deleteStudent);

// Academic Statistics
router.get("/department-stats", requireAdmin, getDepartmentStats);
router.get("/course-stats", requireAdmin, getCourseStats);
router.get("/batches", requireAdmin, getBatchStats);

// Dynamic Department Management
router.get("/departments", requireAdmin, (req, res, next) => {
    if (req.query.stats === "true") {
        return getDepartmentStats(req, res, next);
    }
    return getAdminDepartments(req, res, next);
});
router.get("/departments/:id", requireAdmin, getDepartmentDetails);
router.post("/departments", requireAdmin, createDepartment);
router.put("/departments/:id", requireAdmin, updateDepartment);
router.patch("/departments/:id", requireAdmin, updateDepartment);
router.delete("/departments/:id", requireAdmin, deleteDepartment);

// Course Management
router.get("/courses/:id", requireAdmin, getCourseDetails);
router.post("/departments/:id/courses", requireAdmin, addCourse);
router.put("/courses/:id", requireAdmin, updateCourse);
router.patch("/courses/:id", requireAdmin, updateCourse);
router.delete("/courses/:id", requireAdmin, deleteCourse);

// Batch Management
router.post("/courses/:courseId/batches", requireAdmin, createBatch);
router.get("/batches/:id", requireAdmin, getBatchDetails);
router.put("/batches/:id", requireAdmin, updateBatch);
router.patch("/batches/:id", requireAdmin, updateBatch);
router.delete("/batches/:id", requireAdmin, deleteBatch);

// Class Management
router.post("/batches/:batchId/classes", requireAdmin, createClass);
router.get("/classes/:id", requireAdmin, getClassDetails);
router.put("/classes/:id", requireAdmin, updateClass);
router.patch("/classes/:id", requireAdmin, updateClass);
router.delete("/classes/:id", requireAdmin, deleteClass);
router.get("/classes/:id/students", requireAdmin, getClassStudents);
router.post("/classes/:id/students", requireAdmin, addStudentToClass);

// Batch Student Management
router.get("/batches/:id/students", requireAdmin, getBatchStudents);
router.post("/batches/:id/students", requireAdmin, addStudentToBatch);

module.exports = router;
