import dotenv from "dotenv";
import {
  sendCancellationRequestApproved,
  sendCancellationRequestAcknowledgment,
  sendCancellationRequestRejected,
  sendCancellationRequestReviewNotice,
} from "./src/services/cancellationEmailService.js";

dotenv.config();

const recipient = process.env.TEST_CANCELLATION_EMAIL;
if (!recipient) {
  throw new Error(
    "Set TEST_CANCELLATION_EMAIL to an inbox you control before running this test."
  );
}

const now = new Date();
const request = {
  _id: "TEST-CANCELLATION-REQUEST-001",
  reason: "Other",
  details: "TEST ONLY - sample cancellation request email.",
  reviewerNote: "TEST ONLY - sample Super Admin approval message.",
  createdAt: now,
  refundSnapshot: {
    planName: "TEST ONLY Pro Plan",
    amountPaid: 19900,
    refundAmount: 13266,
    currency: "INR",
    usedDays: 10,
    unusedDays: 20,
    totalDays: 30,
    isFullRefundWindow: false,
    breakdownText: "TEST ONLY pro-rata refund calculation.",
  },
};

const customer = {
  username: "test-cancellation-customer",
  email: recipient,
};

const transaction = {
  amount: 19900,
  currency: "INR",
  paidAt: now,
  createdAt: now,
};

await sendCancellationRequestAcknowledgment({
  to: recipient,
  userName: customer.username,
  request,
  subjectPrefix: "[TEST ONLY] ",
});
console.log(`Customer cancellation email accepted for ${recipient}`);

await sendCancellationRequestReviewNotice({
  to: recipient,
  request,
  customer,
  transaction,
  subjectPrefix: "[TEST ONLY] ",
});
console.log(`Super Admin review email accepted for ${recipient}`);

request.status = "approved";
request.razorpayRefundId = "rfnd_TEST_ONLY_001";
await sendCancellationRequestApproved({
  to: recipient,
  userName: customer.username,
  request,
  subjectPrefix: "[TEST ONLY] ",
});
console.log(`Customer approval email accepted for ${recipient}`);

request.status = "rejected";
request.reviewerNote = "TEST ONLY - sample Super Admin rejection message.";
await sendCancellationRequestRejected({
  to: recipient,
  userName: customer.username,
  request,
  subjectPrefix: "[TEST ONLY] ",
});
console.log(`Customer rejection email accepted for ${recipient}`);
