const jwt = require("jsonwebtoken");
const validator = require("validator");
const sanitizeHtml = require("sanitize-html");

const User = require("../models/user");

const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "8h";

/* ================= SANITIZER ================= */

const sanitizeInput = (input) => {
  if (!input) return null;

  return sanitizeHtml(String(input).trim(), {
    allowedTags: [],
    allowedAttributes: {}
  });
};

/* ================= TOKEN GENERATION ================= */

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
};

/* ================= USER FINDER ================= */

const findUserByIdentifier = async (identifierInput) => {
  const identifier = sanitizeInput(identifierInput);

  if (!identifier) return null;

  if (validator.isEmail(identifier)) {
    return User.findOne({ email: identifier.toLowerCase() });
  }

  return User.findOne({ phone: identifier });
};

/* ================= LOGIN RESPONSE ================= */

const sendLoginResponse = (res, user) => {
  const accessToken = generateAccessToken(user);

  return res.status(200).json({
    success: true,
    accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email || null,
      phone: user.phone || null,
      role: user.role,
      isActive: user.isActive
    }
  });
};

/* ================= REGISTER ================= */

exports.register = async (req, res) => {
  try {
    let { name, email, phone, password } = req.body;

    name = sanitizeInput(name);
    email = email ? sanitizeInput(email).toLowerCase() : null;
    phone = phone ? sanitizeInput(phone) : null;
    password = password ? String(password).trim() : null;

    if (!name || !password || (!email && !phone)) {
      return res.status(400).json({
        message: "Name, password, and email or phone are required"
      });
    }

    if (email && !validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (phone && !validator.isMobilePhone(phone, "any")) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    if (!validator.isStrongPassword(password, {
      minLength: 6,
      minNumbers: 1
    })) {
      return res.status(400).json({
        message: "Password must contain at least 6 characters and one number"
      });
    }

    const duplicateChecks = [];
    if (email) duplicateChecks.push({ email });
    if (phone) duplicateChecks.push({ phone });

    if (duplicateChecks.length > 0) {
      const existingUser = await User.findOne({ $or: duplicateChecks });

      if (existingUser) {
        return res.status(400).json({
          message: "User already registered"
        });
      }
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: "customer"
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email || null,
        phone: user.phone || null,
        role: user.role
      }
    });

  } catch (error) {

    if (error?.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0];

      if (duplicateField === "email") {
        return res.status(400).json({ message: "Email already registered" });
      }

      if (duplicateField === "phone") {
        return res.status(400).json({ message: "Mobile number already registered" });
      }

      return res.status(400).json({ message: "User already registered" });
    }

    if (error?.name === "ValidationError") {
      const firstError = Object.values(error.errors || {})[0];

      return res.status(400).json({
        message: firstError?.message || "Invalid registration data"
      });
    }

    console.error("Registration error:", error);

    return res.status(500).json({
      message: "Server error"
    });
  }
};

/* ================= LOGIN ================= */

exports.login = async (req, res) => {
  try {
    let { emailOrPhone, password } = req.body;

    emailOrPhone = sanitizeInput(emailOrPhone);
    password = password ? String(password).trim() : null;

    if (!emailOrPhone || !password) {
      return res.status(400).json({
        message: "emailOrPhone and password are required"
      });
    }

    const user = await findUserByIdentifier(emailOrPhone);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: "Account inactive" });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return sendLoginResponse(res, user);

  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({ message: "Server error" });
  }
};

/* ================= ADMIN LOGIN ================= */

exports.adminLogin = async (req, res) => {
  try {
    let emailOrPhone = req.body.emailOrPhone || req.body.email;
    let { password } = req.body;

    emailOrPhone = sanitizeInput(emailOrPhone);
    password = password ? String(password).trim() : null;

    if (!emailOrPhone || !password) {
      return res.status(400).json({
        message: "email and password are required"
      });
    }

    const user = await findUserByIdentifier(emailOrPhone);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: "Account inactive" });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return sendLoginResponse(res, user);

  } catch (error) {
    console.error("Admin login error:", error);

    return res.status(500).json({ message: "Server error" });
  }
};

/* ================= ADMIN REFRESH ================= */

exports.adminRefresh = async (req, res) => {
  return res.status(501).json({
    message: "Refresh token flow is not implemented"
  });
};

/* ================= CHANGE PASSWORD ================= */

exports.changePassword = async (req, res) => {
  try {
    let { currentPassword, newPassword } = req.body;

    currentPassword = currentPassword ? String(currentPassword).trim() : null;
    newPassword = newPassword ? String(newPassword).trim() : null;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "currentPassword and newPassword are required"
      });
    }

    if (!validator.isStrongPassword(newPassword, {
      minLength: 6,
      minNumbers: 1
    })) {
      return res.status(400).json({
        message: "New password must contain at least 6 characters and one number"
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        message: "Current password is invalid"
      });
    }

    user.password = newPassword;

    await user.save();

    return res.json({
      success: true,
      message: "Password updated successfully"
    });

  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      message: "Server error"
    });
  }
};