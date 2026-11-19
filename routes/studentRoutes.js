
const express = require("express");

const {
    registerStudent,
    loginStudent,
} = require("../controllers/studentController");
const {
    getPublicAcademicStructure,
} = require("../controllers/departmentController");

const router = express.Router();

router.get("/academic-structure", getPublicAcademicStructure);
router.post("/register", registerStudent);
router.post("/login", loginStudent);

module.exports = router;
