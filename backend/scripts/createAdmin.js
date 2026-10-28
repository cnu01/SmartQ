require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/user");

mongoose.connect(process.env.MONGO_URI);

async function createAdmin() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = new User({
    name: "Main Admin",
    email: "admin@smartq.local",
    password: hashedPassword,
    role: "admin"
  });

  await admin.save();
  console.log("Admin created successfully");
  process.exit();
}

createAdmin();
