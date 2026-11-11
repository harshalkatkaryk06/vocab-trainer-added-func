import mongoose from "mongoose";
import dotenv from "dotenv";
import { sendSubscriptionWelcomeEmail } from "./src/services/subscriptionEmailService.js";

dotenv.config();

const fakeUser = {
  _id: "test_user_id",
  username: "testuser",
  email: process.env.TEST_EMAIL || "test@example.com",
};

const fakePlan = {
  _id: "test_plan_id",
  name: "paid",
  displayName: "Pro Plan",
  description: "Unlimited AI calls",
  aiCalls: "unlimited",
  durationDays: 30,
  price: 19900,
  currency: "INR",
};

const fakeTransaction = {
  _id: "test_transaction_id",
  userId: "test_user_id",
  razorpayOrderId: "order_test123",
  razorpayPaymentId: "pay_test456",
  razorpaySignature: "sig_test789",
  amount: 19900,
  currency: "INR",
  status: "paid",
  planId: "test_plan_id",
  planSnapshot: {
    name: "paid",
    displayName: "Pro Plan",
    aiCalls: "unlimited",
    durationDays: 30,
    price: 19900,
    currency: "INR",
  },
  description: "Subscription to Pro Plan",
  paidAt: new Date(),
};

const fakeSubscription = {
  _id: "test_subscription_id",
  userId: "test_user_id",
  planId: "test_plan_id",
  planSnapshot: {
    name: "paid",
    displayName: "Pro Plan",
    aiCalls: "unlimited",
    durationDays: 30,
    price: 19900,
    currency: "INR",
  },
  type: "purchase",
  status: "active",
  startDate: new Date(),
  expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  grantedBy: "test_user_id",
  grantedByEmail: "test@example.com",
  purchaseReference: "pay_test456",
};

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  try {
    await sendSubscriptionWelcomeEmail({
      user: fakeUser,
      plan: fakePlan,
      transaction: fakeTransaction,
      subscription: fakeSubscription,
    });
    console.log("Welcome email sent successfully!");
  } catch (error) {
    console.error("Failed to send welcome email:", error.message);
  }

  await mongoose.connection.close();
}

main();
