const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { getJwtSecret } = require("../utils/jwt");

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ success: false, message: "Not authorized, no token" });
    }
    const decoded = jwt.verify(token, getJwtSecret());
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "User not found or inactive" });
    }


    req.user = { id: user._id.toString(), _id: user._id, role: user.role };

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Not authorized, token failed" });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") return next();
  return res.status(403).json({ success: false, message: "Admin access only" });
};

const studentOnly = (req, res, next) => {
  if (req.user && req.user.role === "student") return next();
  return res.status(403).json({ success: false, message: "Student access only" });
};

module.exports = { protect, adminOnly, studentOnly };
