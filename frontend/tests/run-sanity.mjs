import assert from "node:assert/strict";

import {
  formatEventSchedule,
  formatTimeLabel,
  getUserInitials
} from "../src/utils/uiHelpers.mjs";
import {
  computeAverageWaitMinutes,
  countWaitingQueues
} from "../src/utils/queueWaitHelpers.mjs";
import {
  addSchedulerService,
  applyAdminLoginSuccess,
  getAdminLoginErrorMessage,
  getNextTheme,
  removeSchedulerService,
  runHeaderLogout,
  updateSchedulerFormData,
  validateSchedulerForm
} from "../src/utils/interactionHelpers.mjs";

const checks = [
  {
    name: "getUserInitials returns uppercase initials and fallback",
    run() {
      assert.equal(getUserInitials("Smart Queue"), "SQ");
      assert.equal(getUserInitials("nishan"), "N");
      assert.equal(getUserInitials(""), "U");
      assert.equal(getUserInitials(null), "U");
    }
  },
  {
    name: "formatTimeLabel converts 24-hour time to 12-hour time",
    run() {
      assert.equal(formatTimeLabel("00:15"), "12:15 AM");
      assert.equal(formatTimeLabel("13:05"), "1:05 PM");
      assert.equal(formatTimeLabel("23:59"), "11:59 PM");
    }
  },
  {
    name: "formatTimeLabel preserves invalid values instead of broken output",
    run() {
      assert.equal(formatTimeLabel("bad-input"), "bad-input");
      assert.equal(formatTimeLabel("25:30"), "25:30");
      assert.equal(formatTimeLabel(undefined), "-");
    }
  },
  {
    name: "formatEventSchedule combines formatted dates and times",
    run() {
      const schedule = formatEventSchedule({
        startDate: "2030-05-01",
        endDate: "2030-05-02",
        startTime: "09:00",
        endTime: "17:30",
        formatDate: (value) => value
      });

      assert.deepEqual(schedule, {
        dateLabel: "2030-05-01 to 2030-05-02",
        timeLabel: "9:00 AM to 5:30 PM"
      });
    }
  },
  {
    name: "admin login success stores token and navigates to dashboard",
    run() {
      const storage = {
        values: {},
        setItem(key, value) {
          this.values[key] = value;
        }
      };
      const calls = [];

      const token = applyAdminLoginSuccess({
        data: { accessToken: "test-token" },
        storage,
        setAuthToken: (value) => calls.push(["auth", value]),
        onNavigate: (value) => calls.push(["nav", value])
      });

      assert.equal(token, "test-token");
      assert.equal(storage.values.token, "test-token");
      assert.deepEqual(calls, [
        ["auth", "test-token"],
        ["nav", "admin-dashboard"]
      ]);
    }
  },
  {
    name: "admin login error fallback is stable",
    run() {
      assert.equal(
        getAdminLoginErrorMessage({ response: { data: { message: "Invalid credentials" } } }),
        "Invalid credentials"
      );
      assert.equal(
        getAdminLoginErrorMessage(new Error("boom")),
        "Authentication service is unavailable. Check the backend URL and server status."
      );
    }
  },
  {
    name: "header theme toggle and logout interactions are stable",
    run() {
      assert.equal(getNextTheme("light"), "dark");
      assert.equal(getNextTheme("dark"), "light");

      const calls = [];
      runHeaderLogout({
        onLogout: () => calls.push("logout"),
        onNavigate: (value) => calls.push(value)
      });

      assert.deepEqual(calls, ["logout", "login"]);
    }
  },
  {
    name: "scheduler interaction helpers handle form transitions",
    run() {
      const baseForm = {
        organizationType: "Hospital",
        doctorName: "Dr. A",
        profession: "Cardio",
        hrOrPocName: "HR",
        serviceTypes: ["General"]
      };

      const updatedForm = updateSchedulerFormData(baseForm, "organizationType", "Interview");
      assert.equal(updatedForm.organizationType, "Interview");
      assert.equal(updatedForm.doctorName, "");
      assert.equal(updatedForm.profession, "");
      assert.equal(updatedForm.hrOrPocName, "");

      assert.deepEqual(addSchedulerService(["One"], " Two "), ["One", "Two"]);
      assert.deepEqual(removeSchedulerService(["One", "Two"], 0), ["Two"]);
    }
  },
  {
    name: "scheduler validation catches invalid combinations",
    run() {
      assert.equal(
        validateSchedulerForm({
          organizationType: "Hospital",
          doctorName: "",
          profession: "",
          hrOrPocName: "",
          startDate: "2030-05-02",
          endDate: "2030-05-01",
          startTime: "09:00",
          endTime: "10:00"
        }),
        "End date must be the same as or later than start date."
      );

      assert.equal(
        validateSchedulerForm({
          organizationType: "Interview",
          doctorName: "",
          profession: "",
          hrOrPocName: "",
          startDate: "2030-05-01",
          endDate: "2030-05-01",
          startTime: "11:00",
          endTime: "10:00"
        }),
        "End time must be later than start time for single-day events."
      );

      assert.equal(
        validateSchedulerForm({
          organizationType: "Hospital",
          doctorName: "",
          profession: "",
          hrOrPocName: "",
          startDate: "2030-05-01",
          endDate: "2030-05-02",
          startTime: "09:00",
          endTime: "10:00"
        }),
        "Doctor Name and Profession are required for Hospital events."
      );
    }
  },
  {
    name: "computeAverageWaitMinutes derives wait from queue position",
    run() {
      const sample = [
        { organizationType: "Hospital", tokenNumber: 1, status: "waiting" },
        { organizationType: "Hospital", tokenNumber: 2, status: "waiting" },
        { organizationType: "Hospital", tokenNumber: 3, status: "completed" }
      ];
      assert.equal(countWaitingQueues(sample), 2);
      assert.ok(computeAverageWaitMinutes(sample) >= 4);
    }
  }
];

let passed = 0;

for (const check of checks) {
  try {
    check.run();
    passed += 1;
    console.log(`PASS ${check.name}`);
  } catch (error) {
    console.error(`FAIL ${check.name}`);
    console.error(error);
    process.exit(1);
  }
}

console.log(`Completed ${passed} frontend sanity checks.`);
