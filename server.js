
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const studentRoutes = require("./routes/studentRoutes");

dotenv.config();

const app = express();

// Middleware
const allowedOrigins = [
    "https://student-cons-fe.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
];

const corsOptions = {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use("/api/students", studentRoutes);
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/bookings", require("./routes/bookingRoutes"));

// Test route
app.get("/", (req, res) => {
    res.json({
        message: "Sereniche Backend is Running!"
    });
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer();
