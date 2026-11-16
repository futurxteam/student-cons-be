/**
 * Sereniche demo data seeder (development only).
 *
 *   npm run seed                  -> 10 students + 3 admins
 *   npm run seed -- --with-bookings -> also adds a few demo bookings
 *
 * Idempotent: existing records (matched by roll number / admin id / username /
 * email) are skipped. Nothing is ever deleted or overwritten.
 * All data is fictional.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Student = require("./models/Student");
const Admin = require("./models/Admin");
const Booking = require("./models/Booking");

const students = [
    { rollNumber: "SER2024001", name: "Aarav Menon", email: "aarav.menon@sereniche-demo.edu", phone: "9876500001", dob: "2004-03-12" },
    { rollNumber: "SER2024002", name: "Diya Nair", email: "diya.nair@sereniche-demo.edu", phone: "9876500002", dob: "2004-07-25" },
    { rollNumber: "SER2024003", name: "Rohan Iyer", email: "rohan.iyer@sereniche-demo.edu", phone: "9876500003", dob: "2003-11-02" },
    { rollNumber: "SER2024004", name: "Ananya Krishnan", email: "ananya.krishnan@sereniche-demo.edu", phone: "9876500004", dob: "2005-01-18" },
    { rollNumber: "SER2024005", name: "Karthik Reddy", email: "karthik.reddy@sereniche-demo.edu", phone: "9876500005", dob: "2004-09-09" },
    { rollNumber: "SER2024006", name: "Meera Pillai", email: "meera.pillai@sereniche-demo.edu", phone: "9876500006", dob: "2003-05-30" },
    { rollNumber: "SER2024007", name: "Vikram Sharma", email: "vikram.sharma@sereniche-demo.edu", phone: "9876500007", dob: "2004-12-14" },
    { rollNumber: "SER2024008", name: "Sneha Joseph", email: "sneha.joseph@sereniche-demo.edu", phone: "9876500008", dob: "2005-04-21" },
    { rollNumber: "SER2024009", name: "Arjun Patel", email: "arjun.patel@sereniche-demo.edu", phone: "9876500009", dob: "2003-08-07" },
    { rollNumber: "SER2024010", name: "Lakshmi Varma", email: "lakshmi.varma@sereniche-demo.edu", phone: "9876500010", dob: "2004-02-27" },
];

// Development-only demo passwords. They are bcrypt-hashed before being stored.
const admins = [
    { adminId: "ADM001", name: "Admin One", username: "adminone", email: "admin.one@sereniche-demo.edu", password: "AdminOne@123" },
    { adminId: "ADM002", name: "Admin Two", username: "admintwo", email: "admin.two@sereniche-demo.edu", password: "AdminTwo@123" },
    { adminId: "ADM003", name: "Admin Three", username: "adminthree", email: "admin.three@sereniche-demo.edu", password: "AdminThree@123" },
];

const slots = ["09:00 AM – 10:00 AM", "11:00 AM – 12:00 PM", "01:00 PM – 02:00 PM", "03:00 PM – 04:00 PM"];

const seed = async () => {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing in backend/.env");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    let added = 0, skipped = 0;
    for (const s of students) {
        const exists = await Student.findOne({ $or: [{ rollNumber: s.rollNumber }, { email: s.email }] });
        if (exists) { skipped++; continue; }
        await Student.create(s);
        added++;
    }
    console.log(`Students: ${added} added, ${skipped} already present`);

    added = 0; skipped = 0;
    for (const a of admins) {
        const exists = await Admin.findOne({
            $or: [{ adminId: a.adminId }, { username: a.username }, { email: a.email }],
        });
        if (exists) { skipped++; continue; }
        await Admin.create({ ...a, password: await bcrypt.hash(a.password, 10), role: "admin" });
        added++;
    }
    console.log(`Admins: ${added} added, ${skipped} already present`);

    if (process.argv.includes("--with-bookings")) {
        // Fixed dates relative to this month so repeated runs don't duplicate.
        const now = new Date();
        const statuses = ["attended", "attended", "not-attended", "pending"];
        let b = 0;
        for (let i = 0; i < students.length; i++) {
            const student = await Student.findOne({ rollNumber: students[i].rollNumber });
            if (!student) continue;
            const monthsBack = i % 4; // spread over 4 months
            const d = new Date(now.getFullYear(), now.getMonth() - monthsBack, 5 + i);
            const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            const time = slots[i % slots.length];
            const exists = await Booking.findOne({ date, time });
            if (exists) continue;
            await Booking.create({
                student: student._id,
                rollNumber: student.rollNumber,
                date,
                time,
                status: monthsBack === 0 ? "pending" : statuses[i % statuses.length],
            });
            b++;
        }
        console.log(`Demo bookings: ${b} added`);
    }

    await mongoose.disconnect();
    console.log("Seeding complete");
};

seed().catch(async (err) => {
    console.error("Seeding failed:", err.message);
    await mongoose.disconnect();
    process.exit(1);
});
