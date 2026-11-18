
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const connectDB = require("./config/db");

const studentRoutes = require("./routes/studentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const bookingRoutes = require("./routes/bookingRoutes");

const app = express();


const allowedOrigins = [
    "https://student-cons-fe.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
];

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests without an origin (Postman, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// API Routes
app.use("/api/students", studentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/bookings", bookingRoutes);

// Health Check Route
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Sereniche Backend is Running!",
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found",
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Server Error:", err.message);

    if (err.message === "Not allowed by CORS") {
        return res.status(403).json({
            success: false,
            message: "CORS policy blocked this request",
        });
    }

    res.status(500).json({
        success: false,
        message: "Internal server error",
    });
});

// Start Server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log("Sereniche API is ready");
        });
    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
};

startServer();
