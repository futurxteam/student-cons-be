/**
 * Safe, non-destructive migration of legacy "admins" and "students"
 * collections into the unified "users" collection.
 *
 * - Preserves original _id values (so bookings keep pointing at the right user)
 * - Assigns role "admin" / "student"
 * - Admin passwords are kept only if they are already bcrypt hashes;
 *   plain-text passwords are hashed once. Existing hashes are never re-hashed.
 * - Skips records that already exist in "users" (by _id, email, rollNumber,
 *   adminId or username) - no duplicates, no overwrites
 * - Old collections are left untouched
 * - Every skipped/failed record is reported, nothing is discarded silently
 *
 * Usage:
 *   node seed/migrateLegacyUsers.js            (dry run, reports only)
 *   node seed/migrateLegacyUsers.js --apply    (performs the migration)
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const APPLY = process.argv.includes("--apply");
const BCRYPT_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

const str = (v) => (typeof v === "string" ? v.trim() : v);

const buildUser = async (doc, role) => {
    const base = {
        _id: doc._id,
        name: str(doc.name),
        email: str(doc.email)?.toLowerCase(),
        role,
    };
    if (doc.createdAt) base.createdAt = doc.createdAt;
    if (doc.updatedAt) base.updatedAt = doc.updatedAt;

    if (role === "student") {
        return {
            ...base,
            rollNumber: str(doc.rollNumber),
            phone: str(doc.phone),
            dob: doc.dob,
        };
    }

    let password = doc.password;
    if (typeof password === "string" && !BCRYPT_RE.test(password)) {
        password = await bcrypt.hash(password, 10); // plain text -> hash once
    }
    return {
        ...base,
        adminId: str(doc.adminId),
        username: str(doc.username)?.toLowerCase(),
        password,
    };
};

const migrateCollection = async (db, collectionName, role) => {
    const stats = { found: 0, migrated: 0, skipped: [], failed: [] };

    const exists = (await db.listCollections({ name: collectionName }).toArray()).length > 0;
    if (!exists) {
        console.log(`- "${collectionName}": collection not found, nothing to migrate`);
        return stats;
    }

    const docs = await db.collection(collectionName).find({}).toArray();
    stats.found = docs.length;

    for (const doc of docs) {
        const label = doc.rollNumber || doc.adminId || doc.username || doc.email || String(doc._id);
        try {
            const user = await buildUser(doc, role);

            const conflicts = [{ _id: user._id }];
            if (user.email) conflicts.push({ email: user.email });
            if (user.rollNumber) conflicts.push({ rollNumber: user.rollNumber });
            if (user.adminId) conflicts.push({ adminId: user.adminId });
            if (user.username) conflicts.push({ username: user.username });

            if (await User.exists({ $or: conflicts })) {
                stats.skipped.push(label);
                continue;
            }

            if (APPLY) {
                await User.create(user); // runs role-based validation
            } else {
                await new User(user).validate();
            }
            stats.migrated++;
        } catch (error) {
            stats.failed.push(`${label}: ${error.message}`);
        }
    }
    return stats;
};

const run = async () => {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not set in backend/.env");

    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    console.log(`MongoDB Connected (database: ${mongoose.connection.name})`);
    console.log(APPLY ? "Mode: APPLY" : "Mode: DRY RUN (use --apply to write)");

    await User.init();

    for (const [collection, role] of [["admins", "admin"], ["students", "student"]]) {
        const s = await migrateCollection(db, collection, role);
        console.log(
            `- "${collection}" -> users (${role}): found ${s.found}, ` +
            `${APPLY ? "migrated" : "would migrate"} ${s.migrated}, ` +
            `skipped (already in users) ${s.skipped.length}, failed ${s.failed.length}`
        );
        s.skipped.forEach((l) => console.log(`    skipped: ${l}`));
        s.failed.forEach((l) => console.log(`    FAILED:  ${l}`));
    }

    console.log("Old collections were not modified or deleted.");
};

run()
    .catch((error) => {
        console.error("Migration failed:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.connection.close();
        console.log("MongoDB connection closed");
    });
