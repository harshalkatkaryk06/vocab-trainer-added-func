import dotenv from "dotenv";
dotenv.config(); // ← must be first, before any other import that needs env vars

import app from "./app.js";
import connectDB from "./config/db.js";
import logger from "./config/logger.js";
import { provisionSuperAdmin } from "./utils/provisionSuperAdmin.js";
import { getOrCreateFreePlan } from "./services/subscriptionService.js";

const PORT = process.env.PORT || 4000;

const seedDefaultPlans = async () => {
  await getOrCreateFreePlan();

  // Drop the old unique index on 'name' if it exists, so multiple plans can share the same name.
  const Plan = (await import("./models/Plan.js")).default;
  try {
    await Plan.collection.dropIndex("name_1");
  } catch (error) {
    // Index may not exist - that's fine
  }

  // Seed a sample paid plan if none exists. Uses upsert so re-seeding is safe
  // even if a paid plan already exists (active or inactive).
  await Plan.findOneAndUpdate(
    { name: "paid" },
    {
      $set: {
        displayName: "Pro",
        description: "Unlimited AI calls with an active subscription.",
        aiCalls: "unlimited",
        durationDays: 30,
        price: 9.99,
        currency: "USD",
        isActive: true,
        isPublic: true,
        sortOrder: 1,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  logger.info("Seeded default Pro (paid) plan");
};

const startServer = async () => {
  try {
    await connectDB();
    await provisionSuperAdmin();
    await seedDefaultPlans();
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Server Startup Failed:", error);
    process.exit(1);
  }
};//start

startServer();
