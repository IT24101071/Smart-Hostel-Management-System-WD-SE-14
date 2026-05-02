import User from "../models/User.js";
import VisitorLog from "../models/VisitorLog.js";
import { sendVisitorCheckoutReminderEmailToStudent } from "../utils/brevoEmail.js";

/**
 * Sends one reminder email per active visitor log when expected checkout is within
 * VISITOR_CHECKOUT_REMINDER_MINUTES_BEFORE (default 15) minutes from now.
 */
export async function runVisitorCheckoutReminderJob() {
  const enabled =
    String(process.env.VISITOR_CHECKOUT_REMINDER_ENABLED ?? "true").toLowerCase() !==
    "false";
  if (!enabled) return;

  const leadMin = Math.max(
    1,
    Number(process.env.VISITOR_CHECKOUT_REMINDER_MINUTES_BEFORE || 15),
  );
  const now = new Date();
  const horizon = new Date(now.getTime() + leadMin * 60 * 1000);

  const logs = await VisitorLog.find({
    status: "checked_in",
    checkoutReminderSentAt: null,
    expectedTimeOut: { $gt: now, $lte: horizon },
  })
    .limit(200)
    .select(
      "studentRef fullName studentRoomSnapshot expectedTimeOut checkoutReminderSentAt",
    );

  for (const log of logs) {
    const student = await User.findById(log.studentRef).select("email name");
    if (!student?.email) continue;

    try {
      await sendVisitorCheckoutReminderEmailToStudent({
        toEmail: student.email,
        studentName: student.name,
        visitorName: log.fullName,
        roomNumber: log.studentRoomSnapshot || "",
        expectedTimeOut: log.expectedTimeOut,
      });
    } catch (error) {
      console.error(`[visitor-reminder-email:checkout-${log._id}] send failed:`, error);
      continue;
    }

    await VisitorLog.updateOne(
      { _id: log._id, checkoutReminderSentAt: null },
      { $set: { checkoutReminderSentAt: new Date() } },
    );
  }
}
