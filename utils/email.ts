// utils/email.ts
import sgMail from "@sendgrid/mail";

// Set SendGrid API key from environment variable
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn("SENDGRID_API_KEY is not set – email notifications will be disabled.");
}

/**
 * Send an email notification to all admin email addresses when a new report is created.
 * The admin emails are provided via the ADMIN_EMAILS environment variable (comma‑separated).
 */
export const sendReportNotification = async (params: {
  reportId: string;
  title: string;
  reporterName: string;
  reporterEmail: string;
}) => {
  const { reportId, title, reporterName, reporterEmail } = params;
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim()).filter(Boolean);
  if (!adminEmails.length) {
    console.warn("No admin email addresses configured – skipping notification.");
    return;
  }

  const msg = {
    to: adminEmails,
    from: process.env.EMAIL_FROM || "no-reply@pengaduanscammer.com",
    subject: `New Scam Report: ${title}`,
    text: `A new scam report has been submitted.

Report ID: ${reportId}
Title: ${title}
Submitted by: ${reporterName} <${reporterEmail}>`
  };

  try {
    await sgMail.send(msg);
    console.log("Report notification email sent to admins.");
  } catch (error) {
    console.error("Failed to send report notification email:", error);
    // Swallow errors so the main flow isn't broken; you can re‑throw if desired.
  }
};
