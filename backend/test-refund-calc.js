import { calculateRefund } from "./src/services/refundService.js";

// Helper functions to build dates
const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000);
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const future = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

/**
 * Build a test transaction and subscription for a given scenario
 */
const buildTestCase = (name, transaction, subscription, now) => {
  return { name, transaction, subscription, now };
};

const testCases = [
  // Case 1: Cancelled after 1 hour (within 48-hour window = full refund)
  buildTestCase(
    "Cancelled after 1 hour",
    {
      amount: 19900,
      currency: "INR",
      planSnapshot: { durationDays: 30 },
    },
    {
      type: "purchase",
      startDate: hoursAgo(1),
      expiryDate: future(29),
    },
    new Date()
  ),

  // Case 2: Cancelled after 47 hours (within 48-hour window = full refund)
  buildTestCase(
    "Cancelled after 47 hours",
    {
      amount: 19900,
      currency: "INR",
      planSnapshot: { durationDays: 30 },
    },
    {
      type: "purchase",
      startDate: hoursAgo(47),
      expiryDate: future(29),
    },
    new Date()
  ),

  // Case 3: Cancelled after 49 hours (beyond 48-hour window = pro-rata)
  buildTestCase(
    "Cancelled after 49 hours",
    {
      amount: 19900,
      currency: "INR",
      planSnapshot: { durationDays: 30 },
    },
    {
      type: "purchase",
      startDate: hoursAgo(49),
      expiryDate: future(29),
    },
    new Date()
  ),

  // Case 4: Cancelled on day 10 of 30 (pro-rata)
  buildTestCase(
    "Cancelled on day 10 of 30",
    {
      amount: 19900,
      currency: "INR",
      planSnapshot: { durationDays: 30 },
    },
    {
      type: "purchase",
      startDate: daysAgo(10),
      expiryDate: future(20),
    },
    new Date()
  ),

  // Case 5: Cancelled on last day (day 30) - usedDays = 30, unusedDays = 0
  buildTestCase(
    "Cancelled on last day (day 30)",
    {
      amount: 19900,
      currency: "INR",
      planSnapshot: { durationDays: 30 },
    },
    {
      type: "purchase",
      startDate: daysAgo(30),
      expiryDate: new Date(),
    },
    new Date()
  ),

  // Case 6: Cancelled after expiry (usedDays > totalDays, unusedDays = 0)
  buildTestCase(
    "Cancelled after expiry",
    {
      amount: 19900,
      currency: "INR",
      planSnapshot: { durationDays: 30 },
    },
    {
      type: "purchase",
      startDate: daysAgo(40),
      expiryDate: daysAgo(10),
    },
    new Date()
  ),

  // Case 7: Manual subscription (not purchase) - should not be refundable
  buildTestCase(
    "Manually granted account (not purchase)",
    {
      amount: 0,
      currency: "INR",
      planSnapshot: { durationDays: 30 },
    },
    {
      type: "manual",
      startDate: daysAgo(5),
      expiryDate: future(25),
    },
    new Date()
  ),
];

console.log("=" .repeat(70));
console.log("REFUND CALCULATION TEST RESULTS");
console.log("=" .repeat(70));

for (const tc of testCases) {
  const result = calculateRefund({
    transaction: tc.transaction,
    subscription: tc.subscription,
    now: tc.now,
  });

  console.log(`\n--- ${tc.name} ---`);
  console.log(`  Amount paid:       ${result.currency} ${(result.amountPaid / 100).toFixed(2)}`);
  console.log(`  Refund amount:     ${result.currency} ${(result.refundAmount / 100).toFixed(2)}`);
  console.log(`  Used days:         ${result.usedDays}`);
  console.log(`  Unused days:       ${result.unusedDays}`);
  console.log(`  Total days:        ${result.totalDays}`);
  console.log(`  Full refund window: ${result.isFullRefundWindow}`);
  console.log(`  Breakdown:         ${result.breakdownText}`);
}

console.log("\n" + "=" .repeat(70));
