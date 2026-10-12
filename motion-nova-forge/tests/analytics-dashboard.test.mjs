import assert from "node:assert/strict";
import test from "node:test";
import { resolveAnalyticsState } from "../src/lib/analytics-dashboard.js";

const analytics = (overrides = {}) => ({
  kpis: {
    totalRegistrations: 4,
    totalParticipants: 2,
    upcomingSessions: 0,
    revenueByCurrency: [],
    outstandingBalanceByCurrency: [],
    ...overrides,
  },
});

test("analytics distinguishes initial loading, errors, empty results and available data", () => {
  assert.equal(resolveAnalyticsState({ isLoading: true, isError: false }), "loading");
  assert.equal(resolveAnalyticsState({ isLoading: false, isError: true }), "error");
  assert.equal(
    resolveAnalyticsState(
      { isLoading: false, isError: false },
      analytics({
        totalRegistrations: 0,
        totalParticipants: 0,
      }),
    ),
    "empty",
  );
  assert.equal(resolveAnalyticsState({ isLoading: false, isError: false }, analytics()), "ready");
});

test("an empty successful analytics response remains distinct from a failed request", () => {
  const zeroData = analytics({ totalRegistrations: 0, totalParticipants: 0 });
  assert.equal(resolveAnalyticsState({ isLoading: false, isError: false }, zeroData), "empty");
  assert.equal(resolveAnalyticsState({ isLoading: false, isError: true }, undefined), "error");
});

test("analytics remain available when sessions exist without registrations or financial data", () => {
  const emptyKpis = analytics({ totalRegistrations: 0, totalParticipants: 0 });
  const withSessions = {
    ...emptyKpis,
    coachAnalytics: { coaches: [{ id: "coach-1", sessions: 2 }] },
    locationAnalytics: { locations: [] },
    trainingRatings: [],
    referralSources: [],
  };
  assert.equal(resolveAnalyticsState({ isLoading: false, isError: false }, withSessions), "ready");
});
