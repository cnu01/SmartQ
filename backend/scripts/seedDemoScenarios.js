/**
 * Seeds users, events, queue rows, event history, and trains ML (if service is up).
 *
 * Usage (from repo root):
 *   node backend/scripts/seedDemoScenarios.js
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const axios = require("axios");
const mongoose = require("mongoose");

const User = require("../models/user");
const Event = require("../models/event");
const Queue = require("../models/queue");
const EventHistory = require("../models/eventHistory");
const QueueCounter = require("../models/queueCounter");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:5001";

const ADMIN = {
  name: "System Admin",
  email: "admin@smartq.local",
  password: "AdminPass123!",
  role: "admin"
};

const DEMO_USERS = Array.from({ length: 15 }, (_, index) => {
  const n = String(index + 1).padStart(2, "0");
  return {
    name: `Demo User ${n}`,
    email: `demo.user.${n}@example.com`,
    password: `DemoPass${n}!`,
    role: "customer"
  };
});

const formatDate = (date) => date.toISOString().slice(0, 10);

const dateRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 14);
  return { startDate: formatDate(start), endDate: formatDate(end) };
};

async function upsertUser({ name, email, password, role }) {
  const existing = await User.findOne({ email });
  if (existing) {
    existing.name = name;
    existing.role = role;
    existing.isActive = true;
    existing.password = password;
    await existing.save();
    return "updated";
  }
  await User.create({ name, email, password, role });
  return "created";
}

async function resetDemoCollections() {
  await Queue.deleteMany({});
  await Event.deleteMany({});
  await EventHistory.deleteMany({});
  await QueueCounter.deleteMany({});
}

function buildTrainingPayload(queueRows) {
  const totalInQueue = queueRows.length;
  return queueRows.map((item, index) => {
    const positionInQueue = Math.max(1, index + 1);
    return {
      service: item.service || "General",
      joinedAt: (item.createdAt || new Date()).toISOString(),
      positionInQueue,
      waitingTime: Math.max(1, positionInQueue * 4),
      totalInQueue,
      noShow: item.status === "cancelled",
      status: item.status || "waiting"
    };
  });
}

async function trainMlService(queueRows) {
  const payload = buildTrainingPayload(queueRows);
  if (payload.length === 0) {
    console.log("ML: skipped (no queue rows)");
    return null;
  }

  try {
    const health = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 5000 });
    console.log("ML health before train:", health.data);

    const trainRes = await axios.post(
      `${ML_SERVICE_URL}/train`,
      { data: payload },
      { timeout: 120000 }
    );
    console.log("ML train:", trainRes.data?.message || trainRes.data);

    const after = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 5000 });
    console.log("ML health after train:", after.data);
    return after.data;
  } catch (error) {
    console.warn(
      "ML train skipped — start Python service: cd backend/ml && python3 ml_service.py",
      error.message
    );
    return null;
  }
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI missing in backend/.env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const { startDate, endDate } = dateRange();

  console.log("Upserting demo users...");
  await upsertUser(ADMIN);
  for (const user of DEMO_USERS) {
    await upsertUser(user);
  }

  console.log("Resetting events, queues, and history...");
  await resetDemoCollections();

  const eventsToCreate = [
    {
      title: "City General — OPD Morning",
      organizationType: "Hospital",
      organizationName: "City General Hospital",
      doctorName: "Dr. Demo Physician",
      profession: "General Medicine",
      startDate,
      endDate,
      date: startDate,
      time: "09:00 - 17:00",
      startTime: "09:00",
      endTime: "17:00",
      location: "Block A, Ground Floor",
      totalTokens: 40,
      serviceTypes: ["General Checkup", "Blood Test", "Pharmacy Pickup"],
      crowdLevel: "High"
    },
    {
      title: "Metro Bank — Branch Services",
      organizationType: "Banking",
      organizationName: "Metro Cooperative Bank",
      startDate,
      endDate,
      date: startDate,
      time: "10:00 - 16:00",
      startTime: "10:00",
      endTime: "16:00",
      location: "Main Branch, Counter Hall",
      totalTokens: 25,
      serviceTypes: ["Account Opening", "Loan Inquiry", "Cheque Deposit"],
      crowdLevel: "Medium"
    },
    {
      title: "TechCorp — Campus Hiring",
      organizationType: "Interview",
      organizationName: "TechCorp Solutions",
      hrOrPocName: "HR Demo Contact",
      startDate,
      endDate,
      date: startDate,
      time: "11:00 - 18:00",
      startTime: "11:00",
      endTime: "18:00",
      location: "Interview Block, Room 204",
      totalTokens: 20,
      serviceTypes: ["Technical Round", "HR Round"],
      crowdLevel: "Medium"
    },
    {
      title: "Citizen Service Center — Documents",
      organizationType: "Government",
      organizationName: "Regional Service Center",
      startDate,
      endDate,
      date: startDate,
      time: "09:30 - 15:30",
      startTime: "09:30",
      endTime: "15:30",
      location: "Gov Complex, Wing C",
      totalTokens: 30,
      serviceTypes: ["ID Verification", "Certificate Request"],
      crowdLevel: "Low"
    }
  ];

  const events = await Event.insertMany(eventsToCreate);
  console.log(`Created ${events.length} active events.`);

  const queuePlan = [
    {
      event: events[0],
      scope: "Hospital",
      service: "General Checkup",
      rows: [
        { status: "waiting", count: 6 },
        { status: "serving", count: 2 },
        { status: "completed", count: 4 },
        { status: "cancelled", count: 1 }
      ]
    },
    {
      event: events[0],
      scope: "Hospital",
      service: "Blood Test",
      rows: [
        { status: "waiting", count: 3 },
        { status: "serving", count: 1 },
        { status: "completed", count: 2 },
        { status: "cancelled", count: 0 }
      ]
    },
    {
      event: events[1],
      scope: "Banking",
      service: "Account Opening",
      rows: [
        { status: "waiting", count: 5 },
        { status: "serving", count: 1 },
        { status: "completed", count: 3 },
        { status: "cancelled", count: 1 }
      ]
    },
    {
      event: events[1],
      scope: "Banking",
      service: "Loan Inquiry",
      rows: [
        { status: "waiting", count: 2 },
        { status: "serving", count: 1 },
        { status: "completed", count: 1 },
        { status: "cancelled", count: 0 }
      ]
    },
    {
      event: events[2],
      scope: "Interview",
      service: "Technical Round",
      rows: [
        { status: "waiting", count: 4 },
        { status: "serving", count: 1 },
        { status: "completed", count: 2 },
        { status: "cancelled", count: 0 }
      ]
    },
    {
      event: events[3],
      scope: "Government",
      service: "ID Verification",
      rows: [
        { status: "waiting", count: 3 },
        { status: "serving", count: 0 },
        { status: "completed", count: 1 },
        { status: "cancelled", count: 0 }
      ]
    }
  ];

  const scopeSeq = new Map();
  let guestIndex = 0;
  const queueDocs = [];

  for (const plan of queuePlan) {
    const eventId = String(plan.event._id);
    for (const block of plan.rows) {
      for (let i = 0; i < block.count; i += 1) {
        guestIndex += 1;
        const seq = (scopeSeq.get(plan.scope) || 0) + 1;
        scopeSeq.set(plan.scope, seq);

        const demoUser = DEMO_USERS[(guestIndex - 1) % DEMO_USERS.length];
        queueDocs.push({
          tokenNumber: seq,
          service: plan.service,
          eventId,
          eventName: plan.event.title,
          organizationName: plan.event.organizationName,
          organizationType: plan.scope,
          guestName: demoUser.name,
          guestEmail: demoUser.email,
          guestMobile: `900000${String(guestIndex).padStart(4, "0")}`,
          status: block.status,
          createdAt: new Date(Date.now() - guestIndex * 7 * 60 * 1000)
        });
      }
    }
  }

  await Queue.insertMany(queueDocs);
  console.log(`Created ${queueDocs.length} queue tokens across all scenarios.`);

  for (const [scope, seq] of scopeSeq.entries()) {
    await QueueCounter.findOneAndUpdate(
      { scope },
      { seq },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  const historySamples = [
    {
      originalEventId: "demo-archived-001",
      title: "Previous Health Camp (archived)",
      organizationType: "Hospital",
      organizationName: "City General Hospital",
      doctorName: "Dr. Demo Physician",
      profession: "General Medicine",
      startDate: formatDate(new Date(Date.now() - 30 * 86400000)),
      endDate: formatDate(new Date(Date.now() - 28 * 86400000)),
      date: formatDate(new Date(Date.now() - 30 * 86400000)),
      time: "09:00 - 14:00",
      startTime: "09:00",
      endTime: "14:00",
      location: "Community Hall",
      totalTokens: 50,
      serviceTypes: ["General Checkup"],
      status: "Completed",
      crowdLevel: "High",
      deletionReason: "completed",
      deletedAt: new Date(Date.now() - 27 * 86400000),
      usersJoined: 48,
      usersCompleted: 45,
      usersCancelled: 3,
      usersServing: 0,
      eventCreatedAt: new Date(Date.now() - 35 * 86400000)
    },
    {
      originalEventId: "demo-archived-002",
      title: "Bank Holiday Rush (archived)",
      organizationType: "Banking",
      organizationName: "Metro Cooperative Bank",
      startDate: formatDate(new Date(Date.now() - 14 * 86400000)),
      endDate: formatDate(new Date(Date.now() - 14 * 86400000)),
      date: formatDate(new Date(Date.now() - 14 * 86400000)),
      time: "10:00 - 13:00",
      startTime: "10:00",
      endTime: "13:00",
      location: "Main Branch",
      totalTokens: 30,
      serviceTypes: ["Cheque Deposit"],
      status: "Completed",
      crowdLevel: "Medium",
      deletionReason: "manual",
      deletedAt: new Date(Date.now() - 13 * 86400000),
      usersJoined: 30,
      usersCompleted: 28,
      usersCancelled: 2,
      usersServing: 0,
      eventCreatedAt: new Date(Date.now() - 20 * 86400000)
    }
  ];

  await EventHistory.insertMany(historySamples);
  console.log(`Created ${historySamples.length} event history records.`);

  console.log("\n--- Where to look in the UI ---");
  console.log("Customer: Landing / Join Queue → 4 live events with token availability");
  console.log("Customer: Login demo.user.01@example.com → dashboard (join an event for live token)");
  console.log("Admin: Queue Management → waiting / serving / completed / cancelled tabs filled");
  console.log("Admin: Counter Management → Hospital, Banking, Interview, Government queues");
  console.log("Admin: Event Scheduler → 4 ongoing/upcoming events");
  console.log("Admin: Event History → 2 archived events");
  console.log("Admin: Analytics & Predictions → charts fed from queue + ML\n");

  console.log("Training ML models...");
  await trainMlService(queueDocs);

  await mongoose.disconnect();
  console.log("\nDemo scenario seed complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
