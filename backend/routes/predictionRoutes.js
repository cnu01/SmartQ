const express = require("express");
const Queue = require("../models/queue");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");
const { getPredictionsIfTrained, clearHealthCache } = require("../services/mlPredictionService");

const router = express.Router();

const buildJoinsByHour = (queues) => {
  const joinsByHour = {};
  queues.forEach((item) => {
    const hour = new Date(item.createdAt || Date.now()).getHours();
    joinsByHour[hour] = (joinsByHour[hour] || 0) + 1;
  });
  return joinsByHour;
};

router.get("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const totalWaiting = await Queue.countDocuments({ status: "waiting" });
    const topService = await Queue.aggregate([
      { $match: { status: "waiting" } },
      { $group: { _id: "$service", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);

    const queueRows = await Queue.find({}).select("createdAt").lean();
    const joinsByHour = buildJoinsByHour(queueRows);

    clearHealthCache();

    const service = topService[0]?._id || "General";
    const predictions = await getPredictionsIfTrained({
      service,
      positionInQueue: 1,
      totalWaiting,
      joinsByHour
    });

    if (!predictions) {
      return res.json({
        trained: false,
        peakTimes: [],
        waitTimePredictions: [],
        optimalVisitTimes: [],
        crowdForecast: [],
        mlModelStats: {
          isSimulated: true,
          trained: false,
          modelAccuracy: null,
          predictionsToday: null,
          avgAccuracy: null,
          lastUpdated: null
        }
      });
    }

    return res.json({
      trained: Boolean(predictions?.mlModelStats?.trained),
      ...predictions,
      crowdForecast: predictions.crowdForecast || []
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
