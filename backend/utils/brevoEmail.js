import { BrevoClient } from "@getbrevo/brevo";

const APP_NAME = "Smart Hostel Management";

/**
 * Sends a password reset OTP via Brevo transactional API (not Nodemailer).
 * @throws {Error} When BREVO_API_KEY or BREVO_SENDER_EMAIL is missing
 */
export async function sendPasswordResetOtpEmail(toEmail, otp) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || APP_NAME;

  if (!apiKey?.trim() || !senderEmail?.trim()) {
    throw new Error(
      "Brevo is not configured: set BREVO_API_KEY and BREVO_SENDER_EMAIL",
    );
  }

  const client = new BrevoClient({ apiKey: apiKey.trim() });

  const subject = `${APP_NAME} — password reset code`;
  const textContent = [
    `Your password reset code is: ${otp}`,
    "",
    `This code expires in 15 minutes. If you did not request a reset, you can ignore this email.`,
    "",
    `— ${APP_NAME}`,
  ].join("\n");

  const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111827;">
  <p>Your password reset code is:</p>
  <p style="font-size: 24px; font-weight: 700; letter-spacing: 0.2em;">${otp}</p>
  <p style="color: #6B7280; font-size: 14px;">This code expires in 15 minutes. If you did not request a reset, you can ignore this email.</p>
  <p style="color: #9CA3AF; font-size: 12px;">— ${APP_NAME}</p>
</body>
</html>`;

  await client.transactionalEmails.sendTransacEmail({
    sender: { email: senderEmail.trim(), name: senderName },
    to: [{ email: toEmail }],
    subject,
    textContent,
    htmlContent,
  });
}
