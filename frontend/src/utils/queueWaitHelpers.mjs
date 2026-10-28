/** Mirrors backend queueRoutes calculateWaitTime for admin stats when API omits fields. */

export const normalizeQueueStatus = (status) => String(status || "").trim().toLowerCase();

export const getQueueScope = (item) =>
  String(item?.organizationType || item?.service || "General").trim() || "General";

export const calculateEstimatedWaitMinutes = (position) => {
  const safePosition = Math.max(1, Number(position) || 1);
  const hour = new Date().getHours();

  let peakMultiplier = 1.0;
  if (hour >= 10 && hour <= 12) peakMultiplier = 1.4;
  else if (hour >= 14 && hour <= 16) peakMultiplier = 1.2;
  else if (hour >= 9 && hour <= 10) peakMultiplier = 1.1;

  return Math.max(1, Math.round(safePosition * 4 * peakMultiplier));
};

export const enrichQueueRowsWithWaitTimes = (queues) => {
  const rows = Array.isArray(queues) ? [...queues] : [];
  rows.sort((a, b) => {
    const scopeCompare = getQueueScope(a).localeCompare(getQueueScope(b));
    if (scopeCompare !== 0) return scopeCompare;
    return (Number(a.tokenNumber) || 0) - (Number(b.tokenNumber) || 0);
  });

  const scopePositions = {};

  return rows.map((item) => {
    if (normalizeQueueStatus(item.status) !== "waiting") {
      return item;
    }

    const scope = getQueueScope(item);
    scopePositions[scope] = (scopePositions[scope] || 0) + 1;
    const position = scopePositions[scope];
    const fromApi = Number(item.estimatedWaitTime);

    return {
      ...item,
      position,
      estimatedWaitTime:
        Number.isFinite(fromApi) && fromApi > 0
          ? fromApi
          : calculateEstimatedWaitMinutes(position)
    };
  });
};

export const computeAverageWaitMinutes = (queues) => {
  const enriched = enrichQueueRowsWithWaitTimes(queues);
  const waiting = enriched.filter((q) => normalizeQueueStatus(q.status) === "waiting");

  if (waiting.length === 0) {
    return 0;
  }

  const total = waiting.reduce(
    (sum, q) => sum + (Number(q.estimatedWaitTime) || 0),
    0
  );

  return Math.round(total / waiting.length);
};

export const countWaitingQueues = (queues) =>
  (Array.isArray(queues) ? queues : []).filter(
    (q) => normalizeQueueStatus(q.status) === "waiting"
  ).length;
