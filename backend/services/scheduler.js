import cron from "node-cron";
import Message from "../models/Message.js";
import { sendFollowUpEmail } from "./emailSender.js";

export function startFollowUpScheduler() {
  console.log("⏰ Follow-up scheduler started");

  // Run every day at 9:00 AM
  cron.schedule(
    "0 9 * * *",
    async () => {
      console.log("⏰ Running daily follow-up check...");

      try {
        const now = new Date();

        // Find all messages that:
        // 1. Were sent but not replied to
        // 2. Follow-up date has passed
        // 3. Follow-up hasn't been sent yet
        const pendingFollowUps = await Message.find({
          status: "sent",
          followUpSent: false,
          followUpDate: { $lte: now },
        }).populate("lead");

        console.log(`📋 Found ${pendingFollowUps.length} follow-ups to send`);

        for (const message of pendingFollowUps) {
          try {
            // Only follow up if lead hasn't replied
            if (message.lead.status !== "replied") {
              await sendFollowUpEmail(message._id);

              // Wait 5 seconds between follow-ups
              await new Promise((resolve) => setTimeout(resolve, 5000));
            }
          } catch (err) {
            console.error(
              `❌ Follow-up error for ${message.lead?.name}:`,
              err.message,
            );
          }
        }

        console.log("✅ Daily follow-up check complete");
      } catch (err) {
        console.error("❌ Scheduler error:", err.message);
      }
    },
    {
      timezone: "Africa/Nairobi",
    },
  );
}
