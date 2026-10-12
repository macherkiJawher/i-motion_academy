import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateDashboardMetrics,
  resolveDashboardState,
  sortRecentRegistrations,
} from "../src/lib/admin-dashboard.js";

test("dashboard metrics use active registration, payment and due rules", () => {
  const metrics = calculateDashboardMetrics(
    [
      {
        status: "PENDING",
        amountDue: 200,
        amountPaid: 50,
        currency: "TND",
        birthDate: "1990-01-01",
        address: "Tunis",
        educationLevel: "Licence",
        motivation: "Motivation",
        identityDocumentAvailable: true,
        qualificationDocumentAvailable: true,
      },
      {
        status: "CONFIRMED",
        amountDue: 100,
        amountPaid: 100,
        currency: "EUR",
        birthDate: "1990-01-01",
        address: "Tunis",
        educationLevel: "Licence",
        motivation: "Motivation",
        identityDocumentAvailable: false,
        qualificationDocumentAvailable: true,
      },
      { status: "COMPLETED", amountDue: 80, amountPaid: 0, currency: "TND" },
      { status: "CANCELLED", amountDue: 300, amountPaid: 0, currency: "TND" },
    ],
    [
      { status: "PAID", amount: 50, currency: "TND" },
      { status: "PAID", amount: 15, currency: "EUR" },
      { status: "PENDING", amount: 100, currency: "TND" },
      { status: "FAILED", amount: 200, currency: "EUR" },
    ],
    [],
    [{ status: "NEW" }, { status: "IN_PROGRESS" }, { status: "RESOLVED" }],
    "2026-10-10",
  );

  assert.equal(metrics.activeRegistrations, 2);
  assert.equal(metrics.registrationsToReview, 1);
  assert.deepEqual(metrics.revenueCollectedByCurrency, { TND: 50, EUR: 15 });
  assert.deepEqual(metrics.outstandingBalanceByCurrency, { TND: 230, EUR: 0 });
  assert.equal(metrics.incompleteApplications, 1);
  assert.equal(metrics.contactsToProcess, 2);
});

test("upcoming sessions exclude past, completed, cancelled and draft sessions", () => {
  const sessions = [
    { startDate: "2026-10-10", capacity: 10, seatsTaken: 8, lifecycleStatus: "SCHEDULED" },
    { startDate: "2026-10-09", capacity: 10, seatsTaken: 10, lifecycleStatus: "SCHEDULED" },
    { startDate: "2026-10-11", capacity: 10, seatsTaken: 10, lifecycleStatus: "COMPLETED" },
    { startDate: "2026-10-12", capacity: 10, seatsTaken: 10, lifecycleStatus: "CANCELLED" },
    { startDate: "2026-10-13", capacity: 10, seatsTaken: 10, lifecycleStatus: "DRAFT" },
    { startDate: "2026-10-14", capacity: 30, seatsTaken: 12, lifecycleStatus: "SCHEDULED" },
  ];
  const metrics = calculateDashboardMetrics([], [], sessions, [], "2026-10-10");

  assert.equal(metrics.upcomingSessions.length, 2);
  assert.equal(metrics.occupancyRate, 50);
});

test("latest registrations are sorted newest first without mutating their source", () => {
  const registrations = [
    { id: "old", createdAt: "2026-10-01T12:00:00.000Z" },
    { id: "newest", createdAt: "2026-10-10T12:00:00.000Z" },
    { id: "middle", createdAt: "2026-10-05T12:00:00.000Z" },
  ];

  assert.deepEqual(
    sortRecentRegistrations(registrations).map(({ id }) => id),
    ["newest", "middle", "old"],
  );
  assert.equal(registrations[0].id, "old");
});

test("dashboard distinguishes loading, API errors, and empty data", () => {
  assert.equal(resolveDashboardState([{ isLoading: true, isError: false }], false), "loading");
  assert.equal(resolveDashboardState([{ isLoading: false, isError: true }], true), "error");
  assert.equal(resolveDashboardState([{ isLoading: false, isError: false }], false), "empty");
});
