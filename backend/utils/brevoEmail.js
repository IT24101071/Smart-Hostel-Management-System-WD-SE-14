import { BrevoClient } from "@getbrevo/brevo";

const APP_NAME = "Smart Hostel Management";
const DEFAULT_SENDER_NAME = process.env.BREVO_SENDER_NAME || APP_NAME;

function getBrevoClient() {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!apiKey?.trim() || !senderEmail?.trim()) {
    throw new Error(
      "Brevo is not configured: set BREVO_API_KEY and BREVO_SENDER_EMAIL",
    );
  }
  return {
    client: new BrevoClient({ apiKey: apiKey.trim() }),
    senderEmail: senderEmail.trim(),
    senderName: DEFAULT_SENDER_NAME,
  };
}

/**
 * Sends a password reset OTP via Brevo transactional API (not Nodemailer).
 * @throws {Error} When BREVO_API_KEY or BREVO_SENDER_EMAIL is missing
 */
export async function sendPasswordResetOtpEmail(toEmail, otp) {
  const { client, senderEmail, senderName } = getBrevoClient();

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

export async function sendSignupOtpEmail(toEmail, otp) {
  const { client, senderEmail, senderName } = getBrevoClient();

  const subject = `${APP_NAME} — signup verification code`;
  const textContent = [
    `Your signup verification code is: ${otp}`,
    "",
    "This code expires in 10 minutes.",
    "",
    `— ${APP_NAME}`,
  ].join("\n");

  const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111827;">
  <p>Your signup verification code is:</p>
  <p style="font-size: 24px; font-weight: 700; letter-spacing: 0.2em;">${otp}</p>
  <p style="color: #6B7280; font-size: 14px;">This code expires in 10 minutes.</p>
  <p style="color: #9CA3AF; font-size: 12px;">— ${APP_NAME}</p>
</body>
</html>`;

  await client.transactionalEmails.sendTransacEmail({
    sender: { email: senderEmail, name: senderName },
    to: [{ email: toEmail }],
    subject,
    textContent,
    htmlContent,
  });
}

function fmtMoney(value) {
  return `Rs. ${Number(value ?? 0).toLocaleString()}`;
}

function fmtDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString();
}

function fmtTicketHeadline(ticket) {
  return `${ticket?.ticketNumber || "Ticket"} (${ticket?.category || "--"} · ${ticket?.urgency || "--"})`;
}

function buildTicketSummaryLines({ ticket, room }) {
  return [
    `Ticket Number: ${ticket?.ticketNumber || "--"}`,
    `Category: ${ticket?.category || "--"}`,
    `Urgency: ${ticket?.urgency || "--"}`,
    `Status: ${ticket?.status || "--"}`,
    `Subject: ${ticket?.subject || "--"}`,
    `Room: ${room?.roomNumber || "--"}`,
    `Created At: ${fmtDate(ticket?.createdAt)}`,
    `Updated At: ${fmtDate(ticket?.updatedAt)}`,
  ];
}

export async function sendBookingConfirmationEmail({
  toEmail,
  studentName,
  booking,
  room,
  includeReceiptAttachment = false,
  receiptPdfBase64 = "",
}) {
  const { client, senderEmail, senderName } = getBrevoClient();
  const subject = `${APP_NAME} — booking confirmation`;

  const roomNumber = room?.roomNumber ?? "--";
  const roomType = room?.roomType ?? "--";
  const roomGender = room?.gender ?? "--";
  const checkIn = fmtDate(booking?.checkInDate);
  const checkOut = fmtDate(booking?.checkOutDate);
  const stayDays = booking?.stayDays ?? "--";
  const paymentMethod = String(booking?.paymentMethod ?? "--").toUpperCase();
  const paymentStatus = String(booking?.paymentStatus ?? "--").toUpperCase();
  const bookingStatus = String(booking?.bookingStatus ?? "--").toUpperCase();

  const textContent = [
    `Hi ${studentName || "Student"},`,
    "",
    "Your room booking is confirmed. Here are your booking details:",
    "",
    `Booking ID: ${booking?._id ?? "--"}`,
    `Room Number: ${roomNumber}`,
    `Room Type: ${roomType}`,
    `Room Gender: ${roomGender}`,
    `Check-In: ${checkIn}`,
    `Check-Out: ${checkOut}`,
    `Stay Days: ${stayDays}`,
    "",
    `Room Fees: ${fmtMoney(booking?.roomFees)}`,
    `Security Deposit: ${fmtMoney(booking?.securityDeposit)}`,
    `Total Paid: ${fmtMoney(booking?.amountPaidByBooker ?? booking?.totalDue)}`,
    `Payment Method: ${paymentMethod}`,
    `Payment Status: ${paymentStatus}`,
    `Booking Status: ${bookingStatus}`,
    "",
    includeReceiptAttachment
      ? "Your payment receipt is attached to this email."
      : "No receipt attachment is included for this payment method.",
    "",
    `— ${APP_NAME}`,
  ].join("\n");

  const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111827;">
  <p>Hi ${studentName || "Student"},</p>
  <p>Your room booking is confirmed. Here are your booking details:</p>
  <ul>
    <li><strong>Booking ID:</strong> ${booking?._id ?? "--"}</li>
    <li><strong>Room Number:</strong> ${roomNumber}</li>
    <li><strong>Room Type:</strong> ${roomType}</li>
    <li><strong>Room Gender:</strong> ${roomGender}</li>
    <li><strong>Check-In:</strong> ${checkIn}</li>
    <li><strong>Check-Out:</strong> ${checkOut}</li>
    <li><strong>Stay Days:</strong> ${stayDays}</li>
    <li><strong>Room Fees:</strong> ${fmtMoney(booking?.roomFees)}</li>
    <li><strong>Security Deposit:</strong> ${fmtMoney(booking?.securityDeposit)}</li>
    <li><strong>Total Paid:</strong> ${fmtMoney(booking?.amountPaidByBooker ?? booking?.totalDue)}</li>
    <li><strong>Payment Method:</strong> ${paymentMethod}</li>
    <li><strong>Payment Status:</strong> ${paymentStatus}</li>
    <li><strong>Booking Status:</strong> ${bookingStatus}</li>
  </ul>
  <p style="color: #6B7280; font-size: 14px;">
    ${
      includeReceiptAttachment
        ? "Your payment receipt is attached to this email."
        : "No receipt attachment is included for this payment method."
    }
  </p>
  <p style="color: #9CA3AF; font-size: 12px;">— ${APP_NAME}</p>
</body>
</html>`;

  const payload = {
    sender: { email: senderEmail, name: senderName },
    to: [{ email: toEmail }],
    subject,
    textContent,
    htmlContent,
  };

  if (includeReceiptAttachment && receiptPdfBase64) {
    payload.attachment = [
      {
        name: `booking-receipt-${booking?._id ?? "receipt"}.pdf`,
        content: receiptPdfBase64,
      },
    ];
  }

  await client.transactionalEmails.sendTransacEmail(payload);
}

function bookingSummaryLines(booking, room) {
  const roomNumber = room?.roomNumber ?? "--";
  const roomType = room?.roomType ?? "--";
  return [
    `Booking ID: ${booking?._id ?? "--"}`,
    `Room: ${roomNumber} (${roomType})`,
    `Check-in: ${fmtDate(booking?.checkInDate)}`,
    `Check-out: ${fmtDate(booking?.checkOutDate)}`,
    `Stay days: ${booking?.stayDays ?? "--"}`,
    `Booking status: ${String(booking?.bookingStatus ?? "--").toUpperCase()}`,
    `Payment status: ${String(booking?.paymentStatus ?? "--").toUpperCase()}`,
  ];
}

/** Student cancelled their own confirmed booking (from app). */
export async function sendBookingCancelledByStudentEmail({
  toEmail,
  studentName,
  booking,
  room,
}) {
  const { client, senderEmail, senderName } = getBrevoClient();
  const subject = `${APP_NAME} — booking cancelled`;
  const lines = bookingSummaryLines(booking, room);
  const textContent = [
    `Hi ${studentName || "Student"},`,
    "",
    "You cancelled your hostel booking. Summary:",
    "",
    ...lines,
    "",
    "If payment had completed, reversals are handled per hostel policy (typically within a few working days).",
    "",
    `— ${APP_NAME}`,
  ].join("\n");

  const htmlList = lines.map((l) => `<li>${l}</li>`).join("");
  const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111827;">
  <p>Hi ${studentName || "Student"},</p>
  <p>You cancelled your hostel booking. Summary:</p>
  <ul>${htmlList}</ul>
  <p style="color: #6B7280; font-size: 14px;">If payment had completed, reversals are handled per hostel policy.</p>
  <p style="color: #9CA3AF; font-size: 12px;">— ${APP_NAME}</p>
</body>
</html>`;

  await client.transactionalEmails.sendTransacEmail({
    sender: { email: senderEmail, name: senderName },
    to: [{ email: toEmail }],
    subject,
    textContent,
    htmlContent,
  });
}

/** Administrator cancelled the student's booking (admin-cancel API). */
export async function sendBookingCancelledByAdminEmail({
  toEmail,
  studentName,
  booking,
  room,
}) {
  const { client, senderEmail, senderName } = getBrevoClient();
  const subject = `${APP_NAME} — booking cancelled by administration`;
  const lines = bookingSummaryLines(booking, room);
  const textContent = [
    `Hi ${studentName || "Student"},`,
    "",
    "Your hostel booking has been cancelled by an administrator. Details:",
    "",
    ...lines,
    "",
    "If you have questions or had completed a payment, please contact hostel support for refunds or next steps.",
    "",
    `— ${APP_NAME}`,
  ].join("\n");

  const htmlList = lines.map((l) => `<li>${l}</li>`).join("");
  const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111827;">
  <p>Hi ${studentName || "Student"},</p>
  <p>Your hostel booking has been <strong>cancelled by an administrator</strong>. Details:</p>
  <ul>${htmlList}</ul>
  <p style="color: #6B7280; font-size: 14px;">If you have questions or completed a payment, please contact hostel support.</p>
  <p style="color: #9CA3AF; font-size: 12px;">— ${APP_NAME}</p>
</body>
</html>`;

  await client.transactionalEmails.sendTransacEmail({
    sender: { email: senderEmail, name: senderName },
    to: [{ email: toEmail }],
    subject,
    textContent,
    htmlContent,
  });
}

/** Student extended or updated stay dates (extendBooking). */
export async function sendBookingAmendedEmail({
  toEmail,
  studentName,
  booking,
  room,
  previousCheckIn,
  previousCheckOut,
  extraDays,
  additionalRoomFees,
}) {
  const { client, senderEmail, senderName } = getBrevoClient();
  const extended = Number(extraDays) > 0;
  const subject = extended
    ? `${APP_NAME} — stay extended`
    : `${APP_NAME} — booking dates updated`;

  const lines = bookingSummaryLines(booking, room);
  const prevLines = [
    `Previous check-in: ${fmtDate(previousCheckIn)}`,
    `Previous check-out: ${fmtDate(previousCheckOut)}`,
  ];
  const feeLine =
    extended && Number(additionalRoomFees) > 0
      ? `Additional room fees: ${fmtMoney(additionalRoomFees)}`
      : null;

  const textContent = [
    `Hi ${studentName || "Student"},`,
    "",
    extended
      ? "Your stay has been extended. Updated details:"
      : "Your stay dates were updated. Details:",
    "",
    ...prevLines,
    "",
    "New dates:",
    ...lines,
    "",
    feeLine,
    extended ? `Additional nights: ${extraDays}` : "",
    "",
    `— ${APP_NAME}`,
  ]
    .filter(Boolean)
    .join("\n");

  const htmlList = lines.map((l) => `<li>${l}</li>`).join("");
  const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111827;">
  <p>Hi ${studentName || "Student"},</p>
  <p>${extended ? "Your stay has been <strong>extended</strong>. Here are your updated details:" : "Your <strong>stay dates</strong> were updated."}</p>
  <p style="color:#374151;font-size:14px;"><strong>Previous:</strong> ${fmtDate(previousCheckIn)} → ${fmtDate(previousCheckOut)}</p>
  <ul>${htmlList}</ul>
  ${
    feeLine
      ? `<p style="color:#111827;"><strong>${feeLine}</strong></p>`
      : ""
  }
  ${extended ? `<p>Additional nights: ${extraDays}</p>` : ""}
  <p style="color: #9CA3AF; font-size: 12px;">— ${APP_NAME}</p>
</body>
</html>`;

  await client.transactionalEmails.sendTransacEmail({
    sender: { email: senderEmail, name: senderName },
    to: [{ email: toEmail }],
    subject,
    textContent,
    htmlContent,
  });
}

export async function sendOperationalAccountInvitationEmail({
  toEmail,
  name,
  role,
  temporaryPassword,
  invitedByRole,
}) {
  const { client, senderEmail, senderName } = getBrevoClient();
  const normalizedRole = String(role || "").trim().toLowerCase();
  const roleLabel = normalizedRole === "warden" ? "Warden" : "Staff";
  const inviterLabel = String(invitedByRole || "").trim().toLowerCase();
  const inviterText = inviterLabel === "admin" ? "Admin" : "Warden";

  const subject = `${APP_NAME} — ${roleLabel} account invitation`;
  const textContent = [
    `Hi ${name || roleLabel},`,
    "",
    `Your ${roleLabel.toLowerCase()} account has been created by a ${inviterText}.`,
    `Email: ${toEmail}`,
    `Temporary Password: ${temporaryPassword}`,
    "",
    "For security, you must change this password at your first sign-in before your account becomes active.",
    "",
    `— ${APP_NAME}`,
  ].join("\n");

  const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111827;">
  <p>Hi ${name || roleLabel},</p>
  <p>Your ${roleLabel.toLowerCase()} account has been created by a ${inviterText}.</p>
  <p><strong>Email:</strong> ${toEmail}<br/><strong>Temporary Password:</strong> ${temporaryPassword}</p>
  <p style="color: #6B7280; font-size: 14px;">For security, you must change this password at your first sign-in before your account becomes active.</p>
  <p style="color: #9CA3AF; font-size: 12px;">— ${APP_NAME}</p>
</body>
</html>`;

  await client.transactionalEmails.sendTransacEmail({
    sender: { email: senderEmail, name: senderName },
    to: [{ email: toEmail }],
    subject,
    textContent,
    htmlContent,
  });
}

export async function sendOperationalAccountActivatedEmail({
  toEmail,
  name,
  role,
}) {
  const { client, senderEmail, senderName } = getBrevoClient();
  const normalizedRole = String(role || "").trim().toLowerCase();
  const roleLabel = normalizedRole === "warden" ? "Warden" : "Staff";

  const subject = `${APP_NAME} — ${roleLabel} account activated`;
  const textContent = [
    `Hi ${name || roleLabel},`,
    "",
    `Your ${roleLabel.toLowerCase()} account is now active.`,
    "Your first-time password change was completed successfully.",
    "",
    `— ${APP_NAME}`,
  ].join("\n");

  const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111827;">
  <p>Hi ${name || roleLabel},</p>
  <p>Your ${roleLabel.toLowerCase()} account is now active.</p>
  <p style="color: #6B7280; font-size: 14px;">Your first-time password change was completed successfully.</p>
  <p style="color: #9CA3AF; font-size: 12px;">— ${APP_NAME}</p>
</body>
</html>`;

  await client.transactionalEmails.sendTransacEmail({
    sender: { email: senderEmail, name: senderName },
    to: [{ email: toEmail }],
    subject,
    textContent,
    htmlContent,
  });
}

export async function sendTicketCreatedEmailToStudent({
  toEmail,
  studentName,
  ticket,
  room,
}) {
  const { client, senderEmail, senderName } = getBrevoClient();
  const subject = `${APP_NAME} — ticket submitted`;
  const summaryLines = buildTicketSummaryLines({ ticket, room });
  const textContent = [
    `Hi ${studentName || "Student"},`,
    "",
    "Your support ticket has been submitted successfully.",
    ...summaryLines,
    "",
    `— ${APP_NAME}`,
  ].join("\n");
  const htmlContent = `
<!DOCTYPE html>
<html><body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111827;">
  <p>Hi ${studentName || "Student"},</p>
  <p>Your support ticket has been submitted successfully.</p>
  <p><strong>${fmtTicketHeadline(ticket)}</strong></p>
  <ul>${summaryLines.map((line) => `<li>${line}</li>`).join("")}</ul>
  <p style="color: #9CA3AF; font-size: 12px;">— ${APP_NAME}</p>
</body></html>`;
  await client.transactionalEmails.sendTransacEmail({
    sender: { email: senderEmail, name: senderName },
    to: [{ email: toEmail }],
    subject,
    textContent,
    htmlContent,
  });
}

export async function sendTicketCreatedEmailToWarden({
  toEmail,
  wardenName,
  ticket,
  studentName,
  room,
}) {
  const { client, senderEmail, senderName } = getBrevoClient();
  const subject = `${APP_NAME} — new student ticket`;
  const summaryLines = buildTicketSummaryLines({ ticket, room });
  const textContent = [
    `Hi ${wardenName || "Warden"},`,
    "",
    `A new ticket was raised by ${studentName || "a student"}.`,
    ...summaryLines,
    "",
    `— ${APP_NAME}`,
  ].join("\n");
  const htmlContent = `
<!DOCTYPE html>
<html><body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111827;">
  <p>Hi ${wardenName || "Warden"},</p>
  <p>A new ticket was raised by <strong>${studentName || "a student"}</strong>.</p>
  <p><strong>${fmtTicketHeadline(ticket)}</strong></p>
  <ul>${summaryLines.map((line) => `<li>${line}</li>`).join("")}</ul>
  <p style="color: #9CA3AF; font-size: 12px;">— ${APP_NAME}</p>
</body></html>`;
  await client.transactionalEmails.sendTransacEmail({
    sender: { email: senderEmail, name: senderName },
    to: [{ email: toEmail }],
    subject,
    textContent,
    htmlContent,
  });
}

export async function sendTicketAssignedEmailToStaff({
  toEmail,
  staffName,
  ticket,
  assignedByName,
}) {
  const { client, senderEmail, senderName } = getBrevoClient();
  const subject = `${APP_NAME} — ticket assigned to you`;
  const textContent = [
    `Hi ${staffName || "Staff"},`,
    "",
    `${assignedByName || "A manager"} assigned a ticket to you.`,
    `Ticket Number: ${ticket?.ticketNumber || "--"}`,
    `Category: ${ticket?.category || "--"}`,
    `Urgency: ${ticket?.urgency || "--"}`,
    `Status: ${ticket?.status || "--"}`,
    `Subject: ${ticket?.subject || "--"}`,
    "",
    `— ${APP_NAME}`,
  ].join("\n");
  const htmlContent = `
<!DOCTYPE html>
<html><body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111827;">
  <p>Hi ${staffName || "Staff"},</p>
  <p><strong>${assignedByName || "A manager"}</strong> assigned a ticket to you.</p>
  <p><strong>${fmtTicketHeadline(ticket)}</strong></p>
  <ul>
    <li>Ticket Number: ${ticket?.ticketNumber || "--"}</li>
    <li>Category: ${ticket?.category || "--"}</li>
    <li>Urgency: ${ticket?.urgency || "--"}</li>
    <li>Status: ${ticket?.status || "--"}</li>
    <li>Subject: ${ticket?.subject || "--"}</li>
  </ul>
  <p style="color: #9CA3AF; font-size: 12px;">— ${APP_NAME}</p>
</body></html>`;
  await client.transactionalEmails.sendTransacEmail({
    sender: { email: senderEmail, name: senderName },
    to: [{ email: toEmail }],
    subject,
    textContent,
    htmlContent,
  });
}

export async function sendTicketUnassignedEmailToStaff({
  toEmail,
  staffName,
  ticket,
  removedByName,
}) {
  const { client, senderEmail, senderName } = getBrevoClient();
  const subject = `${APP_NAME} — ticket no longer assigned to you`;
  const textContent = [
    `Hi ${staffName || "Staff"},`,
    "",
    `${removedByName || "A manager"} removed you from this ticket. It is no longer assigned to you.`,
    `Ticket Number: ${ticket?.ticketNumber || "--"}`,
    `Category: ${ticket?.category || "--"}`,
    `Urgency: ${ticket?.urgency || "--"}`,
    `Status: ${ticket?.status || "--"}`,
    `Subject: ${ticket?.subject || "--"}`,
    "",
    `You do not need to take further action on this ticket unless you are assigned again.`,
    "",
    `— ${APP_NAME}`,
  ].join("\n");
  const htmlContent = `
<!DOCTYPE html>
<html><body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111827;">
  <p>Hi ${staffName || "Staff"},</p>
  <p><strong>${removedByName || "A manager"}</strong> removed you from this ticket. <strong>This task is no longer assigned to you.</strong></p>
  <p><strong>${fmtTicketHeadline(ticket)}</strong></p>
  <ul>
    <li>Ticket Number: ${ticket?.ticketNumber || "--"}</li>
    <li>Category: ${ticket?.category || "--"}</li>
    <li>Urgency: ${ticket?.urgency || "--"}</li>
    <li>Status: ${ticket?.status || "--"}</li>
    <li>Subject: ${ticket?.subject || "--"}</li>
  </ul>
  <p style="color: #6B7280; font-size: 14px;">You do not need to take further action on this ticket unless you are assigned again.</p>
  <p style="color: #9CA3AF; font-size: 12px;">— ${APP_NAME}</p>
</body></html>`;
  await client.transactionalEmails.sendTransacEmail({
    sender: { email: senderEmail, name: senderName },
    to: [{ email: toEmail }],
    subject,
    textContent,
    htmlContent,
  });
}

export async function sendVisitorCheckInEmailToStudent({
  toEmail,
  studentName,
  visitorName,
  roomNumber,
  purposeOfVisit,
  expectedTimeOut,
  checkedInAt,
}) {
  const { client, senderEmail, senderName } = getBrevoClient();
  const subject = `${APP_NAME} — visitor checked in at your room`;
  const roomLine = roomNumber ? `Room: ${roomNumber}` : "Room: —";
  const outStr = fmtDate(expectedTimeOut);
  const inStr = fmtDate(checkedInAt);
  const textContent = [
    `Hi ${studentName || "Student"},`,
    "",
    `A visitor has been checked in for a visit linked to you.`,
    `Visitor: ${visitorName || "—"}`,
    roomLine,
    `Purpose: ${purposeOfVisit || "—"}`,
    `Checked in at: ${inStr}`,
    `Expected checkout (visitor must leave by): ${outStr}`,
    "",
    `If this visit was not expected, contact security or the warden office.`,
    "",
    `— ${APP_NAME}`,
  ].join("\n");
  const htmlContent = `
<!DOCTYPE html>
<html><body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111827;">
  <p>Hi ${studentName || "Student"},</p>
  <p>A visitor has been <strong>checked in</strong> for a visit linked to you.</p>
  <ul>
    <li><strong>Visitor:</strong> ${visitorName || "—"}</li>
    <li><strong>Room:</strong> ${roomNumber || "—"}</li>
    <li><strong>Purpose:</strong> ${purposeOfVisit || "—"}</li>
    <li><strong>Checked in at:</strong> ${inStr}</li>
    <li><strong>Expected checkout:</strong> ${outStr}</li>
  </ul>
  <p style="color: #6B7280; font-size: 14px;">If this visit was not expected, contact security or the warden office.</p>
  <p style="color: #9CA3AF; font-size: 12px;">— ${APP_NAME}</p>
</body></html>`;
  await client.transactionalEmails.sendTransacEmail({
    sender: { email: senderEmail, name: senderName },
    to: [{ email: toEmail }],
    subject,
    textContent,
    htmlContent,
  });
}

export async function sendVisitorCheckoutReminderEmailToStudent({
  toEmail,
  studentName,
  visitorName,
  roomNumber,
  expectedTimeOut,
}) {
  const { client, senderEmail, senderName } = getBrevoClient();
  const subject = `${APP_NAME} — visitor checkout time soon`;
  const outStr = fmtDate(expectedTimeOut);
  const textContent = [
    `Hi ${studentName || "Student"},`,
    "",
    `This is a reminder: your visitor's expected checkout time is approaching.`,
    `Visitor: ${visitorName || "—"}`,
    `Room: ${roomNumber || "—"}`,
    `Expected checkout: ${outStr}`,
    "",
    `Please ensure your visitor checks out on time.`,
    "",
    `— ${APP_NAME}`,
  ].join("\n");
  const htmlContent = `
<!DOCTYPE html>
<html><body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111827;">
  <p>Hi ${studentName || "Student"},</p>
  <p><strong>Reminder:</strong> your visitor&apos;s expected checkout time is <strong>soon</strong>.</p>
  <ul>
    <li><strong>Visitor:</strong> ${visitorName || "—"}</li>
    <li><strong>Room:</strong> ${roomNumber || "—"}</li>
    <li><strong>Expected checkout:</strong> ${outStr}</li>
  </ul>
  <p style="color: #6B7280; font-size: 14px;">Please ensure your visitor checks out on time.</p>
  <p style="color: #9CA3AF; font-size: 12px;">— ${APP_NAME}</p>
</body></html>`;
  await client.transactionalEmails.sendTransacEmail({
    sender: { email: senderEmail, name: senderName },
    to: [{ email: toEmail }],
    subject,
    textContent,
    htmlContent,
  });
}

export async function sendTicketResolvedEmailToStudent({
  toEmail,
  studentName,
  ticket,
  resolvedByName,
}) {
  const { client, senderEmail, senderName } = getBrevoClient();
  const subject = `${APP_NAME} — ticket resolved`;
  const textContent = [
    `Hi ${studentName || "Student"},`,
    "",
    `Your ticket has been resolved by ${resolvedByName || "our support team"}.`,
    `Ticket Number: ${ticket?.ticketNumber || "--"}`,
    `Category: ${ticket?.category || "--"}`,
    `Urgency: ${ticket?.urgency || "--"}`,
    `Status: ${ticket?.status || "Resolved"}`,
    `Subject: ${ticket?.subject || "--"}`,
    "",
    `— ${APP_NAME}`,
  ].join("\n");
  const htmlContent = `
<!DOCTYPE html>
<html><body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111827;">
  <p>Hi ${studentName || "Student"},</p>
  <p>Your ticket has been resolved by <strong>${resolvedByName || "our support team"}</strong>.</p>
  <p><strong>${fmtTicketHeadline(ticket)}</strong></p>
  <ul>
    <li>Ticket Number: ${ticket?.ticketNumber || "--"}</li>
    <li>Category: ${ticket?.category || "--"}</li>
    <li>Urgency: ${ticket?.urgency || "--"}</li>
    <li>Status: ${ticket?.status || "Resolved"}</li>
    <li>Subject: ${ticket?.subject || "--"}</li>
  </ul>
  <p style="color: #9CA3AF; font-size: 12px;">— ${APP_NAME}</p>
</body></html>`;
  await client.transactionalEmails.sendTransacEmail({
    sender: { email: senderEmail, name: senderName },
    to: [{ email: toEmail }],
    subject,
    textContent,
    htmlContent,
  });
}
export async function sendRefundConfirmationEmail({
  toEmail,
  studentName,
  booking,
}) {
  const { client, senderEmail, senderName } = getBrevoClient();
  const subject = `${APP_NAME} — refund processed`;

  const amount = fmtMoney(booking?.amountPaidByBooker ?? booking?.totalDue);

  const textContent = [
    `Hi ${studentName || "Student"},`,
    "",
    "Your refund has been processed successfully. The amount has been reversed to your original payment method.",
    "",
    `Booking ID: ${booking?._id ?? "--"}`,
    `Refund Amount: ${amount}`,
    "",
    "It may take 3-5 business days for the funds to appear in your account depending on your bank.",
    "",
    `— ${APP_NAME}`,
  ].join("\n");

  const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111827;">
  <p>Hi ${studentName || "Student"},</p>
  <p>Your refund has been processed successfully. The amount has been reversed to your original payment method.</p>
  <ul>
    <li><strong>Booking ID:</strong> ${booking?._id ?? "--"}</li>
    <li><strong>Refund Amount:</strong> ${amount}</li>
  </ul>
  <p style="color: #6B7280; font-size: 14px;">It may take 3-5 business days for the funds to appear in your account depending on your bank.</p>
  <p style="color: #9CA3AF; font-size: 12px;">— ${APP_NAME}</p>
</body>
</html>`;

  await client.transactionalEmails.sendTransacEmail({
    sender: { email: senderEmail, name: senderName },
    to: [{ email: toEmail }],
    subject,
    textContent,
    htmlContent,
  });
}
