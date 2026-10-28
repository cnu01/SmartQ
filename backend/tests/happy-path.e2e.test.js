process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret";
process.env.NODE_ENV = "test";

const request = require("supertest");

let mockEventSeq = 1;
let mockQueueSeq = 1;
let mockCounterSeq = 0;
const mockEvents = [];
const mockQueues = [];
const mockEventHistory = [];

const mockAdminUser = {
  _id: "507f191e810c19729de860ea",
  name: "API Admin",
  email: "admin_e2e_test@example.com",
  phone: null,
  role: "admin",
  isActive: true,
  branchId: "branch-1",
  comparePassword: jest.fn(async (password) => password === "AdminPass123!")
};

const createQueryChain = (items) => ({
  sort(sortObj = {}) {
    const entries = [...items];
    const [sortKey, sortDir] = Object.entries(sortObj)[0] || [];
    if (sortKey) {
      entries.sort((a, b) => {
        if (a[sortKey] === b[sortKey]) return 0;
        return a[sortKey] > b[sortKey] ? sortDir : -sortDir;
      });
    }

    return {
      limit(limitCount) {
        return {
          lean: async () => entries.slice(0, limitCount).map((item) => ({ ...item }))
        };
      },
      lean: async () => entries.map((item) => ({ ...item }))
    };
  },
  lean: async () => items.map((item) => ({ ...item }))
});

const matchesCondition = (value, condition) => {
  if (condition && typeof condition === "object" && !Array.isArray(condition)) {
    if ("$ne" in condition) return value !== condition.$ne;
    if ("$lt" in condition) return value < condition.$lt;
    if ("$in" in condition) return condition.$in.includes(value);
  }

  return value === condition;
};

const matchesQuery = (item, query = {}) =>
  Object.entries(query).every(([key, condition]) => matchesCondition(item[key], condition));

jest.mock("../models/user", () => ({
  findOne: jest.fn(async (query) => {
    if (query?.email === mockAdminUser.email || query?.phone === mockAdminUser.phone) {
      return mockAdminUser;
    }
    return null;
  }),
  findById: jest.fn(async (id) => (id === mockAdminUser._id ? mockAdminUser : null))
}));

jest.mock("../models/event", () => {
  return class MockEvent {
    constructor(data) {
      Object.assign(this, data);
      this._id = this._id || `event-${mockEventSeq++}`;
      this.createdAt = this.createdAt || new Date("2030-05-01T09:00:00.000Z");
    }

    async save() {
      const record = { ...this };
      const index = mockEvents.findIndex((event) => event._id === record._id);
      if (index >= 0) {
        mockEvents[index] = record;
      } else {
        mockEvents.push(record);
      }
      return this;
    }

    static find() {
      return createQueryChain(mockEvents);
    }

    static async findById(id) {
      const event = mockEvents.find((item) => String(item._id) === String(id));
      return event ? { ...event } : null;
    }

    static async findByIdAndDelete(id) {
      const index = mockEvents.findIndex((item) => String(item._id) === String(id));
      if (index === -1) return null;
      const [removed] = mockEvents.splice(index, 1);
      return removed;
    }
  };
});

jest.mock("../models/queue", () => {
  class MockQueue {
    constructor(data) {
      Object.assign(this, data);
      this._id = this._id || `queue-${mockQueueSeq++}`;
      this.status = this.status || "waiting";
      this.createdAt = this.createdAt || new Date("2030-05-01T09:30:00.000Z");
    }

    async save() {
      const duplicate = mockQueues.find(
        (item) =>
          item.organizationType === this.organizationType &&
          item.tokenNumber === this.tokenNumber &&
          item._id !== this._id
      );

      if (duplicate) {
        const error = new Error("Duplicate queue token");
        error.code = 11000;
        error.keyPattern = { organizationType: 1, tokenNumber: 1 };
        throw error;
      }

      mockQueues.push({ ...this });
      return this;
    }

    static find(query = {}) {
      return createQueryChain(mockQueues.filter((item) => matchesQuery(item, query)));
    }

    static async countDocuments(query = {}) {
      return mockQueues.filter((item) => matchesQuery(item, query)).length;
    }

    static async aggregate(pipeline = []) {
      const matchStage = pipeline.find((stage) => stage.$match)?.$match || {};
      const matched = mockQueues.filter((item) => matchesQuery(item, matchStage));
      const grouped = new Map();

      matched.forEach((item) => {
        const key = item.eventId;
        const current = grouped.get(key) || {
          _id: key,
          joinedTokens: 0,
          inProgressTokens: 0,
          activeQueueCount: 0
        };

        if (item.status !== "cancelled") current.joinedTokens += 1;
        if (item.status === "serving") current.inProgressTokens += 1;
        if (["waiting", "serving"].includes(item.status)) current.activeQueueCount += 1;
        grouped.set(key, current);
      });

      return [...grouped.values()];
    }

    static async deleteMany(query = {}) {
      const keep = mockQueues.filter((item) => !matchesQuery(item, query));
      mockQueues.length = 0;
      mockQueues.push(...keep);
      return { deletedCount: 0 };
    }

    static async findByIdAndUpdate(id, update) {
      const index = mockQueues.findIndex((item) => String(item._id) === String(id));
      if (index === -1) return null;
      mockQueues[index] = { ...mockQueues[index], ...update };
      return { ...mockQueues[index] };
    }

    static async syncIndexes() {
      return undefined;
    }
  }

  return MockQueue;
});

jest.mock("../models/queueCounter", () => ({
  findOneAndUpdate: jest.fn(() => {
    mockCounterSeq += 1;
    return {
      lean: async () => ({ seq: mockCounterSeq })
    };
  })
}));

jest.mock("../models/eventHistory", () => {
  return class MockEventHistory {
    constructor(data) {
      Object.assign(this, data);
    }

    async save() {
      mockEventHistory.push({ ...this });
      return this;
    }
  };
});

jest.mock("../services/emailService", () => ({
  sendQueueRegistrationEmail: jest.fn(async () => ({ success: true }))
}));

jest.mock("../services/mlPredictionService", () => ({
  getPredictionsIfTrained: jest.fn(async () => null)
}));

jest.mock("../services/eventCleanupService", () => ({
  purgeExpiredEvents: jest.fn(async () => ({ deletedEvents: 0, deletedQueues: 0 })),
  isEventExpired: jest.fn(() => false)
}));

jest.mock("../../src/services/mlSafeWrapper", () => ({
  callMLInference: jest.fn(async () => ({ ok: true })),
  getMLHealth: jest.fn(async () => ({ trained: true }))
}));

jest.mock("axios", () => ({
  post: jest.fn(async () => ({ data: { trained: true } })),
  get: jest.fn(async () => ({ data: { trained: true } }))
}));

const { app } = require("../app");

describe("happy path e2e flow", () => {
  beforeEach(() => {
    mockEvents.length = 0;
    mockQueues.length = 0;
    mockEventHistory.length = 0;
    mockEventSeq = 1;
    mockQueueSeq = 1;
    mockCounterSeq = 0;
  });

  test("admin can create an event and a customer can join and check queue status", async () => {
    const loginRes = await request(app)
      .post("/api/auth/admin/login")
      .send({
        emailOrPhone: mockAdminUser.email,
        password: "AdminPass123!"
      });

    expect(loginRes.status).toBe(200);
    const adminToken = loginRes.body.accessToken;
    expect(adminToken).toBeTruthy();

    const createEventRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "General Checkup Camp",
        organizationType: "Hospital",
        organizationName: "City General Hospital",
        doctorName: "Dr. Kumar",
        profession: "General Medicine",
        startDate: "2030-05-01",
        endDate: "2030-05-01",
        startTime: "09:00",
        endTime: "17:00",
        location: "Main Block",
        totalTokens: 10,
        serviceTypes: ["General Consultation"]
      });

    expect(createEventRes.status).toBe(201);
    expect(createEventRes.body.title).toBe("General Checkup Camp");

    const eventsRes = await request(app).get("/api/events");
    expect(eventsRes.status).toBe(200);
    expect(eventsRes.body).toHaveLength(1);
    expect(eventsRes.body[0].availableTokens).toBe(10);

    const joinRes = await request(app)
      .post("/api/queue/join")
      .send({
        service: "General Consultation",
        guestName: "Demo Guest",
        guestEmail: "demo.guest@example.com",
        isCustomerUser: true,
        eventId: createEventRes.body._id,
        eventName: createEventRes.body.title,
        organizationName: createEventRes.body.organizationName,
        organizationType: createEventRes.body.organizationType
      });

    expect(joinRes.status).toBe(201);
    expect(joinRes.body.tokenNumber).toBe(1);
    expect(joinRes.body.position).toBe(1);
    expect(joinRes.body.service).toBe("General Consultation");

    const statusRes = await request(app)
      .get(`/api/queue/status/${joinRes.body.tokenNumber}`)
      .query({ service: "General Consultation" });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.status).toBe("waiting");
    expect(statusRes.body.position).toBe(1);

    const adminQueueRes = await request(app)
      .get("/api/queue")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(adminQueueRes.status).toBe(200);
    expect(adminQueueRes.body).toHaveLength(1);
    expect(adminQueueRes.body[0].guestName).toBe("Demo Guest");

    const refreshedEventsRes = await request(app).get("/api/events");
    expect(refreshedEventsRes.status).toBe(200);
    expect(refreshedEventsRes.body[0].availableTokens).toBe(9);
    expect(refreshedEventsRes.body[0].joinedTokens).toBe(1);
  });
});
