const nodemailer = require("nodemailer");

// Public frontend base URL used in every user-facing email link.
// Set FRONTEND_URL in the deployment environment (e.g. the Vercel frontend URL);
// localhost is only a development fallback.
const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:5173").replace(
  /\/+$/,
  ""
);

let cachedTransporter = null;

function getSenderEmail() {
  if (process.env.EMAIL_USER && process.env.EMAIL_USER.includes("@")) {
    return process.env.EMAIL_USER.trim();
  }
  if (process.env.NODEMAILER_APPNAME && process.env.NODEMAILER_APPNAME.includes("@")) {
    return process.env.NODEMAILER_APPNAME.trim();
  }
  return "zeeshaankhalid.ch@gmail.com";
}

function createTransporter(pass) {
  const user = getSenderEmail();
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: parseInt(process.env.EMAIL_PORT, 10) === 465,
    auth: {
      user,
      pass: pass ? pass.trim() : "",
    },
  });
}

async function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const candidates = [
    process.env.EMAIL_PASS,
    process.env.NODEMAILER_APPPASSWORD,
  ].filter(Boolean);

  for (const pass of candidates) {
    const t = createTransporter(pass);
    try {
      await t.verify();
      console.log("📧 Email service ready (authenticated with Google SMTP)");
      cachedTransporter = t;
      return cachedTransporter;
    } catch (e) {
      console.warn("⚠️  Email pass candidate rejected, checking next option...", e.message);
    }
  }

  // Fallback to default transporter if verification fails or no candidates
  cachedTransporter = createTransporter(candidates[0]);
  return cachedTransporter;
}

// Initial connection check at startup
getTransporter().catch((error) => {
  console.log("⚠️  Email service not configured:", error.message);
});

async function sendPasswordResetEmail(toEmail, userName, token, clientOrigin) {
  let baseUrl = clientOrigin;
  if (!baseUrl || !baseUrl.startsWith("http")) {
    baseUrl = FRONTEND_URL;
  } else {
    baseUrl = baseUrl.replace(/\/+$/, "");
  }

  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  const senderEmail = getSenderEmail();

  const mailOptions = {
    from: `"Campus Coin" <${senderEmail}>`,
    to: toEmail,
    subject: "🔐 Reset your Campus Coin password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <h1 style="color: #7f1d3a; margin: 0 0 8px 0; font-size: 24px;">Campus Coin</h1>
          <p style="color: #888; margin: 0 0 24px 0; font-size: 12px;">Smart Spending, Student Style</p>

          <h2 style="color: #1f2937; font-size: 20px;">Password Reset Request</h2>
          <p style="color: #555;">Hi ${userName},</p>
          <p style="color: #555;">
            We received a request to reset your Campus Coin password. Click the button below to set a new password:
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}"
               style="display: inline-block; background: #0B0F0E; color: #C7F36B; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">
              Reset Password
            </a>
          </div>

          <p style="color: #555; font-size: 14px;">Or copy this link into your browser:</p>
          <p style="word-break: break-all; color: #7f1d3a; font-size: 13px; background: #f5f5f5; padding: 12px; border-radius: 6px;">
            ${resetUrl}
          </p>

          <p style="color: #888; font-size: 13px; margin-top: 24px;">
            ⏰ This link will expire in <strong>1 hour</strong>.
          </p>

          <p style="color: #888; font-size: 13px;">
            If you didn't request this password reset, you can safely ignore this email.
          </p>

          <hr style="margin: 32px 0; border: none; border-top: 1px solid #eee;" />

          <p style="color: #aaa; font-size: 11px; text-align: center; margin: 0;">
            Campus Coin · Student Finance Manager<br>
            This is an automated email, please do not reply.
          </p>
        </div>
      </div>
    `,
  };

  const transporter = await getTransporter();
  return transporter.sendMail(mailOptions);
}


async function sendReportEmail(toEmail, userName, reportData) {
  const {
    summary,
    categoryBreakdown = [],
    periodLabel = "This Month",
  } = reportData;


  const categoryRows = categoryBreakdown
    .map(
      (c, i) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #1f2937;">${i + 1}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #1f2937;">${c.name}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #dc2626; text-align: right; font-weight: 600;">₹${c.value.toLocaleString()}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #6b7280; text-align: right;">${c.percent}%</td>
      </tr>
    `
    )
    .join("");

  const categoryTable =
    categoryBreakdown.length > 0
      ? `
      <h3 style="color: #1f2937; font-size: 16px; margin: 24px 0 12px 0;">Spending by Category</h3>
      <table style="width: 100%; border-collapse: collapse; background: #fafafa; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #7f1d3a;">
            <th style="padding: 10px 12px; color: white; font-size: 12px; text-align: left;">#</th>
            <th style="padding: 10px 12px; color: white; font-size: 12px; text-align: left;">Category</th>
            <th style="padding: 10px 12px; color: white; font-size: 12px; text-align: right;">Amount</th>
            <th style="padding: 10px 12px; color: white; font-size: 12px; text-align: right;">%</th>
          </tr>
        </thead>
        <tbody>${categoryRows}</tbody>
      </table>
    `
      : "";

  const balanceColor = summary.savings >= 0 ? "#16a34a" : "#dc2626";

  const mailOptions = {
    from: `"Campus Coin" <${getSenderEmail()}>`,
    to: toEmail,
    subject: `📊 Your Campus Coin Report — ${periodLabel}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">

          <div style="border-bottom: 2px solid #7f1d3a; padding-bottom: 16px; margin-bottom: 24px;">
            <h1 style="color: #7f1d3a; margin: 0 0 6px 0; font-size: 24px;">Campus Coin</h1>
            <p style="color: #888; margin: 0; font-size: 12px;">Financial Report · ${periodLabel}</p>
          </div>

          <p style="color: #555; font-size: 14px;">Hi ${userName},</p>
          <p style="color: #555; font-size: 14px;">
            Here is your financial summary for <strong>${periodLabel}</strong> generated on ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}.
          </p>

          <!-- Summary Cards -->
          <table style="width: 100%; border-collapse: separate; border-spacing: 10px 0; margin: 24px 0;">
            <tr>
              <td style="background: #f0fdf4; border-radius: 10px; padding: 16px; text-align: center; width: 33%;">
                <p style="color: #16a34a; font-size: 11px; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Income</p>
                <p style="color: #166534; font-size: 20px; margin: 0; font-weight: 700;">₹${summary.income.toLocaleString()}</p>
              </td>
              <td style="background: #fef2f2; border-radius: 10px; padding: 16px; text-align: center; width: 33%;">
                <p style="color: #dc2626; font-size: 11px; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Expense</p>
                <p style="color: #991b1b; font-size: 20px; margin: 0; font-weight: 700;">₹${summary.expense.toLocaleString()}</p>
              </td>
              <td style="background: #f0f9ff; border-radius: 10px; padding: 16px; text-align: center; width: 33%;">
                <p style="color: #2563eb; font-size: 11px; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Balance</p>
                <p style="color: ${balanceColor}; font-size: 20px; margin: 0; font-weight: 700;">₹${summary.savings.toLocaleString()}</p>
              </td>
            </tr>
          </table>

          ${categoryTable}

          <!-- CTA -->
          <div style="text-align: center; margin: 32px 0 12px 0;">
            <a href="${FRONTEND_URL}/reports"
               style="display: inline-block; background: #7f1d3a; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
              View Full Report
            </a>
          </div>

          <hr style="margin: 28px 0 16px 0; border: none; border-top: 1px solid #eee;" />

          <p style="color: #aaa; font-size: 11px; text-align: center; margin: 0;">
            Campus Coin · Student Finance Manager<br>
            This is an automated email, please do not reply.
          </p>
        </div>
      </div>
    `,
  };

  const activeTransporter = await getTransporter();
  return activeTransporter.sendMail(mailOptions);
}

module.exports = { sendPasswordResetEmail, sendReportEmail, getTransporter };