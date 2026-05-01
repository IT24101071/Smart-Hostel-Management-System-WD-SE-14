import PDFDocument from "pdfkit";

function formatDateTime(value) {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString();
}

export function buildBookingReceiptText(booking) {
  return [
    "SMART HOSTEL MANAGEMENT SYSTEM",
    "Payment Receipt",
    "",
    `Receipt No: RCP-${String(booking._id).slice(-8).toUpperCase()}`,
    `Booking ID: ${booking._id}`,
    `Generated At: ${formatDateTime(new Date())}`,
    "",
    `Room: ${booking.room?.roomNumber ?? "--"}`,
    `Check-In: ${formatDateTime(booking.checkInDate)}`,
    `Check-Out: ${formatDateTime(booking.checkOutDate)}`,
    `Stay Days: ${booking.stayDays}`,
    "",
    `Room Fees: Rs. ${Number(booking.roomFees ?? 0).toLocaleString()}`,
    `Security Deposit: Rs. ${Number(booking.securityDeposit ?? 0).toLocaleString()}`,
    `Total Paid: Rs. ${Number(booking.totalDue ?? 0).toLocaleString()}`,
    `Payment Method: ${String(booking.paymentMethod ?? "").toUpperCase()}`,
    `Payment Status: ${String(booking.paymentStatus ?? "").toUpperCase()}`,
    "",
    "Thank you for your payment.",
  ].join("\n");
}

export async function buildBookingReceiptPdfBase64(booking) {
  const receiptText = buildBookingReceiptText(booking);
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    info: {
      Title: `Booking Receipt ${booking?._id ?? ""}`,
      Author: "Smart Hostel Management System",
    },
  });

  const chunks = [];
  return await new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      const buffer = Buffer.concat(chunks);
      resolve(buffer.toString("base64"));
    });
    doc.on("error", reject);

    doc.font("Helvetica-Bold").fontSize(16).text("SMART HOSTEL MANAGEMENT SYSTEM");
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(14).text("Payment Receipt");
    doc.moveDown();
    doc.font("Helvetica").fontSize(11).text(receiptText, {
      lineGap: 4,
    });
    doc.end();
  });
}
