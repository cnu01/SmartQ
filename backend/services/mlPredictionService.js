const { callMLInference, getMLHealth } = require("../../src/services/mlSafeWrapper");
const { isPredictionBundle } = require("../../src/utils/mlValidation");
const logger = require("../../src/utils/mlLogger");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "https://smartq-ml.onrender.com";
const ML_HEALTH_TIMEOUT_MS = Number(process.env.ML_HEALTH_TIMEOUT_MS || 3000);
const ML_HEALTH_CACHE_TTL_MS = Number(process.env.ML_HEALTH_CACHE_TTL_MS || 15000);

const PEAK_HIGH_THRESHOLD = 25;
const PEAK_MEDIUM_THRESHOLD = 12;

const toPeakLevel = (queueDensity) => {
  if (queueDensity > PEAK_HIGH_THRESHOLD) return "High";
  if (queueDensity > PEAK_MEDIUM_THRESHOLD) return "Medium";
  return "Low";
};

/** Classify each hour relative to the busiest slot in the forecast window. */
const applyRelativePeakLevels = (peakTimes) => {
  if (!Array.isArray(peakTimes) || peakTimes.length === 0) {
    return peakTimes;
  }

  const maxCustomers = Math.max(...peakTimes.map((row) => Number(row.customers) || 0), 1);

  return peakTimes.map((row) => {
    const customers = Number(row.customers) || 0;
    let prediction = "Low";

    if (customers >= maxCustomers * 0.85 || customers === maxCustomers) {
      prediction = "High";
    } else if (customers >= maxCustomers * 0.55) {
      prediction = "Medium";
    }

    const confidence = Math.min(
      99,
      Math.max(55, Math.round(55 + (customers / maxCustomers) * 40))
    );

    return {
      ...row,
      prediction,
      confidence
    };
  });
};

const mapBestTimeScore = (queueLength, waitingTime) => {
  // Lower queue length and wait time should produce better scores.
  const penalty = Number(queueLength || 0) * 2 + Number(waitingTime || 0);
  return Math.max(0, Math.min(100, 100 - penalty));
};

const r2ToAccuracyPercent = (score) => {
  if (score === null || score === undefined || !Number.isFinite(Number(score))) {
    return null;
  }
  return Math.max(0, Math.min(99, Math.round(Number(score) * 100)));
};

const buildModelStats = ({ health, peakTimes, isSimulated, reason, service }) => {
  const scores = health?.model_scores || {};
  const scoreList = ["waitingTime", "queueLength", "noShow", "peakHours"]
    .map((key) => scores[key])
    .filter((value) => value !== null && value !== undefined && Number.isFinite(Number(value)));
  const percents = scoreList.map(r2ToAccuracyPercent).filter((value) => value !== null);

  return {
    isSimulated,
    trained: Boolean(health?.trained && !isSimulated),
    modelAccuracy: r2ToAccuracyPercent(scores.waitingTime),
    avgAccuracy: percents.length
      ? Math.round(percents.reduce((sum, value) => sum + value, 0) / percents.length)
      : null,
    predictionsToday: Array.isArray(peakTimes) ? peakTimes.length : 6,
    lastUpdated: new Date().toISOString(),
    reason,
    service,
    trainingRecords: health?.total_records ?? null
  };
};

const businessHourFactor = (hour) => {
  if (hour >= 9 && hour <= 12) return 1.18;
  if (hour >= 13 && hour <= 17) return 1.1;
  if (hour >= 18 && hour <= 21) return 1.02;
  return 0.78;
};

const estimatePeakCustomers = (density, hour, joinsByHour, offset) => {
  const historical = Number(joinsByHour?.[hour] || 0);
  const trendFactor = Math.max(0.65, 1 - offset * 0.05);
  const mlEstimate = Number(density || 0) * businessHourFactor(hour) * trendFactor;

  if (historical > 0) {
    return Math.max(0, Math.round(mlEstimate * 0.45 + historical * 0.55));
  }

  return Math.max(0, Math.round(mlEstimate));
};

const estimateWaitMinutes = (offset, totalWaiting, positionInQueue, hour) => {
  const pressure = Math.max(Number(totalWaiting) || 0, Number(positionInQueue) || 1);
  const virtualPosition = Math.max(1, Math.round(pressure * (1 - offset * 0.14)));
  return Math.max(1, Math.round(virtualPosition * 2.1 * businessHourFactor(hour)));
};

const diversifyWaitPredictions = (rows, totalWaiting, positionInQueue) => {
  if (!Array.isArray(rows) || rows.length === 0) return rows;

  const values = rows.map((row) => Number(row.predictedWait) || 0);
  const allSame = values.every((value) => value === values[0]);

  if (!allSame) return rows;

  return rows.map((row, offset) => {
    const hour = (new Date().getHours() + offset) % 24;
    return {
      ...row,
      predictedWait: estimateWaitMinutes(offset, totalWaiting, positionInQueue, hour)
    };
  });
};

const buildCrowdForecast = (peakTimes, optimalVisitTimes) => {
  if (Array.isArray(peakTimes) && peakTimes.length > 0) {
    return peakTimes.slice(0, 7).map((slot, index) => ({
      date: index === 0 ? "Today" : `+${index}h`,
      time: slot.hour,
      level: slot.prediction,
      probability: Number.isFinite(slot.confidence) ? slot.confidence : 70
    }));
  }

  if (Array.isArray(optimalVisitTimes) && optimalVisitTimes.length > 0) {
    return optimalVisitTimes.map((slot, index) => ({
      date: index === 0 ? "Today" : `Day ${index + 1}`,
      time: slot.time,
      level: slot.crowdLevel || "Medium",
      probability: Number.isFinite(slot.score) ? slot.score : 65
    }));
  }

  return [];
};

let cachedHealth = null;
let cachedHealthAt = 0;

const getHealth = async () => {
  const now = Date.now();
  if (cachedHealth && now - cachedHealthAt < ML_HEALTH_CACHE_TTL_MS) {
    return cachedHealth;
  }

  const health = await getMLHealth({
    mlServiceUrl: ML_SERVICE_URL,
    timeoutMs: ML_HEALTH_TIMEOUT_MS
  });

  cachedHealth = health && typeof health === "object" ? health : null;
  cachedHealthAt = now;

  return cachedHealth;
};

const clearHealthCache = () => {
  cachedHealth = null;
  cachedHealthAt = 0;
};

const buildFallbackPredictionBundle = ({
  service = "General",
  positionInQueue = 1,
  totalWaiting = 0,
  joinsByHour = {},
  reason = "ml-unavailable",
  health = null
} = {}) => {
  const safePosition = Math.max(1, Number(positionInQueue || 1));
  const safeWaiting = Math.max(0, Number(totalWaiting || 0));
  const now = new Date();

  const peakTimes = applyRelativePeakLevels(
    Array.from({ length: 6 }).map((_, offset) => {
      const d = new Date(now.getTime() + offset * 60 * 60 * 1000);
      const hour = d.getHours();
      const load = estimatePeakCustomers(safeWaiting, hour, joinsByHour, offset);
      return {
        hour: `${String(hour).padStart(2, "0")}:00`,
        prediction: toPeakLevel(load),
        customers: load
      };
    })
  );

  const waitTimePredictions = Array.from({ length: 4 }).map((_, offset) => {
    const d = new Date(now.getTime() + offset * 60 * 60 * 1000);
    return {
      time: offset === 0 ? "Now" : `+${offset} hour${offset > 1 ? "s" : ""}`,
      predictedWait: estimateWaitMinutes(offset, safeWaiting, safePosition, d.getHours())
    };
  });

  const optimalVisitTimes = [1, 2, 3].map((offset) => {
    const hour = (now.getHours() + offset + 1) % 24;
    const nextHour = (hour + 1) % 24;
    const queueLength = Math.max(0, safeWaiting - offset);
    const waitTime = Math.max(1, queueLength * 2);
    return {
      time: `${String(hour).padStart(2, "0")}:00-${String(nextHour).padStart(2, "0")}:00`,
      score: mapBestTimeScore(queueLength, waitTime),
      waitTime,
      crowdLevel: toPeakLevel(queueLength)
    };
  });

  return {
    peakTimes,
    waitTimePredictions,
    optimalVisitTimes,
    crowdForecast: buildCrowdForecast(peakTimes, optimalVisitTimes),
    totalWaiting: safeWaiting,
    serviceWaiting: null,
    crowdLevel: toPeakLevel(safeWaiting),
    mlModelStats: buildModelStats({
      health,
      peakTimes,
      isSimulated: true,
      reason,
      service
    })
  };
};

const getPredictionsIfTrained = async ({
  service = "General",
  positionInQueue = 1,
  totalWaiting = 0,
  joinsByHour = {}
} = {}) => {
  const health = await getHealth();
  if (!health || !health.trained) {
    return buildFallbackPredictionBundle({
      service,
      positionInQueue,
      totalWaiting,
      joinsByHour,
      reason: "ml-not-trained",
      health
    });
  }

  const now = new Date();
  const call = async (endpoint, payload) =>
    callMLInference({
      endpoint,
      payload,
      mlServiceUrl: ML_SERVICE_URL,
      timeoutMs: 5000
    });

  try {
    const peakTimesRaw = await Promise.all(
      Array.from({ length: 6 }).map(async (_, offset) => {
        const d = new Date(now.getTime() + offset * 60 * 60 * 1000);
        const current = await call("/predict/peak-hours", {
          service,
          dayOfWeek: d.getDay(),
          hourOfDay: d.getHours(),
          month: d.getMonth() + 1,
          dayOfMonth: d.getDate()
        });
        const density = Number(current.queueDensity ?? current.current?.queueDensity ?? 0);
        const hour = d.getHours();
        const customers = estimatePeakCustomers(density, hour, joinsByHour, offset);
        return {
          hour: `${String(hour).padStart(2, "0")}:00`,
          prediction: toPeakLevel(customers),
          customers
        };
      })
    );

    const peakTimes = applyRelativePeakLevels(peakTimesRaw);

    let waitTimePredictions = await Promise.all(
      Array.from({ length: 4 }).map(async (_, offset) => {
        const d = new Date(now.getTime() + offset * 60 * 60 * 1000);
        const hour = d.getHours();
        const forecastPosition = Math.max(
          1,
          Math.round(Math.max(Number(totalWaiting) || 0, Number(positionInQueue) || 1) * (1 - offset * 0.14))
        );
        const result = await call("/predict/waiting-time", {
          service,
          dayOfWeek: d.getDay(),
          hourOfDay: hour,
          month: d.getMonth() + 1,
          dayOfMonth: d.getDate(),
          positionInQueue: forecastPosition
        });
        return {
          time: offset === 0 ? "Now" : `+${offset} hour${offset > 1 ? "s" : ""}`,
          predictedWait: Math.max(0, Math.round(Number(result.waitingTime || 0)))
        };
      })
    );

    waitTimePredictions = diversifyWaitPredictions(
      waitTimePredictions,
      totalWaiting,
      positionInQueue
    );

    const bestTimeRaw = await call("/suggest/best-time", {
      service,
      dayOfWeek: now.getDay()
    });
    const suggestions = Array.isArray(bestTimeRaw.suggestions) ? bestTimeRaw.suggestions : [];
    const optimalVisitTimes = suggestions.map((s) => {
      const hour = String(s.hour).padStart(2, "0");
      const nextHour = String((Number(s.hour) + 1) % 24).padStart(2, "0");
      const waitTime = Math.max(0, Math.round(Number(s.waitingTime || 0)));
      const queueLength = Math.max(0, Math.round(Number(s.queueLength || 0)));
      return {
        time: `${hour}:00-${nextHour}:00`,
        score: mapBestTimeScore(queueLength, waitTime),
        waitTime,
        crowdLevel: toPeakLevel(queueLength)
      };
    });

    const result = {
      peakTimes,
      waitTimePredictions,
      optimalVisitTimes,
      crowdForecast: buildCrowdForecast(peakTimes, optimalVisitTimes),
      totalWaiting,
      serviceWaiting: null,
      crowdLevel: toPeakLevel(totalWaiting),
      mlModelStats: buildModelStats({
        health,
        peakTimes,
        isSimulated: false,
        reason: null,
        service
      })
    };

    if (!isPredictionBundle(result)) {
      logger.warn("Prediction bundle shape invalid; returning simulated fallback");
      return buildFallbackPredictionBundle({
        service,
        positionInQueue,
        totalWaiting,
        joinsByHour,
        reason: "invalid-ml-shape",
        health
      });
    }

    return result;
  } catch (error) {
    logger.error("ML prediction build failed", { message: error.message });
    clearHealthCache();
    return buildFallbackPredictionBundle({
      service,
      positionInQueue,
      totalWaiting,
      joinsByHour,
      reason: "ml-call-failed",
      health
    });
  }
};

module.exports = {
  getHealth,
  getPredictionsIfTrained,
  clearHealthCache
};
