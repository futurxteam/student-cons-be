/**
 * Seeds 1 admin + 10 students into the unified "users" collection.
 * Idempotent: a record is skipped if any unique identifier already exists
 * (email, rollNumber, adminId, username). Existing data is never modified
 * or deleted, and existing passwords are never overwritten.
 *
 * Usage: npm run seed
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const admin = {
    adminId: "ADM001",
    name: "Sereniche Administrator",
    username: "admin",
    email: "admin@sereniche.com",
    password: "Admin@123",
};

// dob uses YYYY-MM-DD, matching the login form's date input
const students = [
    ["SER2024001", "Aarav Menon", "aarav.menon@sereniche-demo.edu", "9876500001", "2004-03-12"],
    ["SER2024002", "Diya Nair", "diya.nair@sereniche-demo.edu", "9876500002", "2004-07-25"],
    ["SER2024003", "Rohan Iyer", "rohan.iyer@sereniche-demo.edu", "9876500003", "2003-11-02"],
    ["SER2024004", "Ananya Krishnan", "ananya.krishnan@sereniche-demo.edu", "9876500004", "2005-01-18"],
    ["SER2024005", "Karthik Reddy", "karthik.reddy@sereniche-demo.edu", "9876500005", "2004-09-09"],
    ["SER2024006", "Meera Pillai", "meera.pillai@sereniche-demo.edu", "9876500006", "2003-05-30"],
    ["SER2024007", "Vikram Sharma", "vikram.sharma@sereniche-demo.edu", "9876500007", "2004-12-14"],
    ["SER2024008", "Sneha Joseph", "sneha.joseph@sereniche-demo.edu", "9876500008", "2005-04-21"],
    ["SER2024009", "Arjun Patel", "arjun.patel@sereniche-demo.edu", "9876500009", "2003-08-07"],
    ["SER2024010", "Lakshmi Varma", "lakshmi.varma@sereniche-demo.edu", "9876500010", "2004-02-27"],
].map(([rollNumber, name, email, phone, dob]) => ({ rollNumber, name, email, phone, dob }));

const seed = async () => {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is not set in backend/.env");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected (database: ${mongoose.connection.name})`);

    // Make sure unique/sparse indexes exist before inserting
    await User.init();

    const result = {
        admins: { inserted: 0, skipped: 0 },
        students: { inserted: 0, skipped: 0 },
    };

    // Admin
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

    // Students
    for (const s of students) {
        const exists = await User.exists({
            $or: [{ email: s.email }, { rollNumber: s.rollNumber }],
        });
        if (exists) {
            result.students.skipped++;
        } else {
            await User.create({ ...s, role: "student" });
            result.students.inserted++;
        }
    }

    const [adminCount, studentCount, total] = await Promise.all([
        User.countDocuments({ role: "admin" }),
        User.countDocuments({ role: "student" }),
        User.countDocuments({}),
    ]);

    console.log("Seed completed successfully");
    console.log(`Admins:   ${result.admins.inserted} inserted, ${result.admins.skipped} skipped (already exist)`);
    console.log(`Students: ${result.students.inserted} inserted, ${result.students.skipped} skipped (already exist)`);
    console.log(`Users collection now holds ${adminCount} admin(s), ${studentCount} student(s), ${total} total`);
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
