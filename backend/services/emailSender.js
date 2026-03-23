import nodemailer from "nodemailer";
import Message from "../models/Message.js";
import Lead from "../models/Lead.js";

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify transporter connection
transporter.verify((error, success) => {
  if (error) {
    console.error("Email transporter error:", error.message);
    console.error("EMAIL_USER:", process.env.EMAIL_USER);
    console.error(
      "EMAIL_PASS set:",
      process.env.EMAIL_PASS
        ? "YES (" + process.env.EMAIL_PASS.length + " chars)"
        : "NO",
    );
  } else {
    console.log("Email transporter ready");
  }
});

export async function sendOutreachEmail(messageId) {
  console.log(`Sending email for message: ${messageId}`);

  // Fetch message with lead details
  const message = await Message.findById(messageId).populate("lead");
  if (!message) throw new Error("Message not found");

  const lead = message.lead;
  if (!lead.email) throw new Error(`No email address for lead: ${lead.name}`);

  try {
    const mailOptions = {
      from: `Your Name <${process.env.EMAIL_USER}>`,
      to: lead.email,
      subject: message.subject,
      text: message.body,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="white-space: pre-line; font-size: 15px; line-height: 1.7; color: #333;">
            ${message.body}
          </div>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;"/>
          <p style="font-size: 12px; color: #999;">
            You received this email because your profile matched our search.
            <a href="mailto:${process.env.EMAIL_USER}?subject=Unsubscribe">Unsubscribe</a>
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    // Update message status to sent
    message.status = "sent";
    message.sentAt = new Date();

    // Schedule follow-up 3 days from now
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 3);
    message.followUpDate = followUpDate;
    message.followUpSent = false;

    await message.save();

    console.log(
      `Email sent to ${lead.name} (${lead.email}) — ID: ${info.messageId}`,
    );
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`Failed to send to ${lead.name}:`, err.message);
    throw err;
  }
}

export async function sendBulkEmails(messageIds) {
  console.log(`Sending ${messageIds.length} emails...`);

  const results = [];
  const errors = [];

  for (const messageId of messageIds) {
    try {
      const result = await sendOutreachEmail(messageId);
      results.push({ messageId, ...result });

      // Wait 3 seconds between emails to avoid spam filters
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } catch (err) {
      errors.push({ messageId, error: err.message });
    }
  }

  console.log(
    `Bulk send complete: ${results.length} sent, ${errors.length} failed`,
  );
  return { results, errors };
}

export async function sendFollowUpEmail(messageId) {
  console.log(`🔄 Sending follow-up for message: ${messageId}`);

  const originalMessage = await Message.findById(messageId).populate("lead");
  if (!originalMessage) throw new Error("Message not found");

  const lead = originalMessage.lead;
  if (!lead.email) throw new Error(`No email for lead: ${lead.name}`);

  // Build follow-up email
  const followUpSubject = `Re: ${originalMessage.subject}`;
  const followUpBody = `Hi ${lead.name.split(" ")[0]},

I wanted to follow up on my previous email in case it got buried.

${originalMessage.body}

Would love to connect if the timing is right!

Best,
${process.env.EMAIL_USER}`;

  try {
    const mailOptions = {
      from: `Your Name <${process.env.EMAIL_USER}>`,
      to: lead.email,
      subject: followUpSubject,
      text: followUpBody,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="white-space: pre-line; font-size: 15px; line-height: 1.7; color: #333;">
            ${followUpBody}
          </div>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;"/>
          <p style="font-size: 12px; color: #999;">
            <a href="mailto:${process.env.EMAIL_USER}?subject=Unsubscribe">Unsubscribe</a>
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    // Mark follow-up as sent
    originalMessage.followUpSent = true;
    await originalMessage.save();

    // Update lead status
    await Lead.findByIdAndUpdate(lead._id, { status: "contacted" });

    console.log(`Follow-up sent to ${lead.name}`);
    return { success: true };
  } catch (err) {
    console.error(`Follow-up failed for ${lead.name}:`, err.message);
    throw err;
  }
}
