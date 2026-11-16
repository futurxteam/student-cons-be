const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ message: "Authentication required" });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid or expired token" });
    }
};

const requireRole = (role) => [
    verifyToken,
    (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ message: "Access denied" });
        }
        next();
    },
];

module.exports = {
    verifyToken,
    requireAdmin: requireRole("admin"),
    requireStudent: requireRole("student"),
};
