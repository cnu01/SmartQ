/**
 * Seeds one admin (if missing) and 15 demo customer accounts.
 * Run from repo root: node backend/scripts/seedDemoUsers.js
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const User = require("../models/user");

const DEMO_USERS = Array.from({ length: 15 }, (_, index) => {
  const n = String(index + 1).padStart(2, "0");
  return {
    name: `Demo User ${n}`,
    email: `demo.user.${n}@example.com`,
    password: `DemoPass${n}!`,
    role: "customer"
  };
});

const ADMIN = {
  name: "System Admin",
  email: "admin@smartq.local",
  password: "AdminPass123!",
  role: "admin"
};

async function upsertUser({ name, email, phone, password, role }) {
  const existing = await User.findOne({ email });
  if (existing) {
    existing.name = name;
    existing.role = role;
    existing.isActive = true;
    existing.password = password;
    await existing.save();
    return { email, password, role, status: "updated" };
  }

  await User.create({
    name,
    email,
    phone: phone || undefined,
    password,
    role
  });

  return { email, password, role, status: "created" };
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set in backend/.env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const results = [];
  results.push(await upsertUser(ADMIN));

  for (const user of DEMO_USERS) {
    results.push(await upsertUser(user));
  }

  console.log("\n=== Smart'Q demo accounts ===\n");
  console.log("Admin (for dashboard):");
  console.log(`  Email:    ${ADMIN.email}`);
  console.log(`  Password: ${ADMIN.password}\n`);
  console.log("Customers (15):\n");
  console.log("| # | Email | Password |");
  console.log("|---|-------|----------|");
  DEMO_USERS.forEach((u, i) => {
    console.log(`| ${i + 1} | ${u.email} | ${u.password} |`);
  });
  console.log("\nSeed summary:", results.filter((r) => r.status === "created").length, "created,",
    results.filter((r) => r.status === "updated").length, "updated");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
