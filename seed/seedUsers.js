
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { initAcademicData } = require("../config/initAcademicData");

const admin = {
    adminId: "ADM001",
    name: "Sereniche Administrator",
    username: "admin",
    email: "admin@sereniche.com",
    password: "Admin@123",
};

const students = [
    {
        rollNumber: "SER2024001",
        name: "Aarav Menon",
        email: "aarav.menon@sereniche-demo.edu",
        phone: "9876500001",
        dob: "2004-03-12",
        department: "Computer Science",
        course: "MCA",
        batch: "2024-2026",
        year: "2nd Year",
    },
    {
        rollNumber: "SER2024002",
        name: "Diya Nair",
        email: "diya.nair@sereniche-demo.edu",
        phone: "9876500002",
        dob: "2004-07-25",
        department: "Computer Science",
        course: "BCA",
        batch: "2023-2026",
        year: "3rd Year",
    },
    {
        rollNumber: "SER2024003",
        name: "Rohan Iyer",
        email: "rohan.iyer@sereniche-demo.edu",
        phone: "9876500003",
        dob: "2003-11-02",
        department: "Commerce",
        course: "B.Com",
        batch: "2023-2026",
        year: "3rd Year",
    },
    {
        rollNumber: "SER2024004",
        name: "Ananya Krishnan",
        email: "ananya.krishnan@sereniche-demo.edu",
        phone: "9876500004",
        dob: "2005-01-18",
        department: "Computer Science",
        course: "BCA",
        batch: "2024-2027",
        year: "2nd Year",
    },
    {
        rollNumber: "SER2024005",
        name: "Karthik Reddy",
        email: "karthik.reddy@sereniche-demo.edu",
        phone: "9876500005",
        dob: "2004-09-09",
        department: "Management",
        course: "BBA",
        batch: "2023-2026",
        year: "3rd Year",
    },
    {
        rollNumber: "SER2024006",
        name: "Meera Pillai",
        email: "meera.pillai@sereniche-demo.edu",
        phone: "9876500006",
        dob: "2003-05-30",
        department: "Computer Science",
        course: "MCA",
        batch: "2024-2026",
        year: "2nd Year",
    },
    {
        rollNumber: "SER2024007",
        name: "Vikram Sharma",
        email: "vikram.sharma@sereniche-demo.edu",
        phone: "9876500007",
        dob: "2004-12-14",
        department: "Commerce",
        course: "B.Com",
        batch: "2024-2027",
        year: "2nd Year",
    },
    {
        rollNumber: "SER2024008",
        name: "Sneha Joseph",
        email: "sneha.joseph@sereniche-demo.edu",
        phone: "9876500008",
        dob: "2005-04-21",
        department: "Management",
        course: "BBA",
        batch: "2024-2027",
        year: "2nd Year",
    },
    {
        rollNumber: "SER2024009",
        name: "Arjun Patel",
        email: "arjun.patel@sereniche-demo.edu",
        phone: "9876500009",
        dob: "2003-08-07",
        department: "Computer Science",
        course: "MCA",
        batch: "2023-2025",
        year: "2nd Year",
    },
    {
        rollNumber: "SER2024010",
        name: "Lakshmi Varma",
        email: "lakshmi.varma@sereniche-demo.edu",
        phone: "9876500010",
        dob: "2004-02-27",
        department: "Commerce",
        course: "B.Com",
        batch: "2024-2027",
        year: "2nd Year",
    },
];

const seed = async () => {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is not set in backend/.env");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log(
        `MongoDB Connected (database: ${mongoose.connection.name})`
    );

    await initAcademicData();
    await User.init();

    const result = {
        admins: { inserted: 0, skipped: 0 },
        students: { inserted: 0, skipped: 0 },
    };

    // Seed Admin
    const adminExists = await User.exists({
        $or: [
            { email: admin.email },
            { adminId: admin.adminId },
            { username: admin.username },
        ],
    });

    if (adminExists) {
        result.admins.skipped++;
    } else {
        await User.create({
            ...admin,
            password: await bcrypt.hash(admin.password, 10),
            role: "admin",
        });

        result.admins.inserted++;
    }


    for (const student of students) {
        const exists = await User.exists({
            $or: [
                { email: student.email },
                { rollNumber: student.rollNumber },
            ],
        });

        if (exists) {
            result.students.skipped++;
        } else {
            await User.create({
                ...student,
                role: "student",
            });

            result.students.inserted++;
        }
    }

    const [adminCount, studentCount, total] = await Promise.all([
        User.countDocuments({ role: "admin" }),
        User.countDocuments({ role: "student" }),
        User.countDocuments({}),
    ]);

    console.log("Seed completed successfully");
    console.log(
        `Admins: ${result.admins.inserted} inserted, ${result.admins.skipped} skipped`
    );
    console.log(
        `Students: ${result.students.inserted} inserted, ${result.students.skipped} skipped`
    );
    console.log(
        `Total: ${adminCount} admins, ${studentCount} students, ${total} users`
    );
};

seed()
    .catch((error) => {
        console.error("Seeding failed:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.connection.close();
        console.log("MongoDB connection closed");
    });
