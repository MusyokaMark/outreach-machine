import express from "express";
import { scrapeLinkedInLeads } from "../services/scraper.js";
import {
  generateOutreachMessage,
  generateBulkMessages,
  regenerateMessage,
} from "../services/aiEngine.js";
import {
  sendOutreachEmail,
  sendBulkEmails,
  sendFollowUpEmail,
} from "../services/emailSender.js";
import Lead from "../models/Lead.js";
import Message from "../models/Message.js";
import { verifyToken } from "../services/auth.js";

const router = express.Router();

router.use(verifyToken);

// ── Scraping ──────────────────────────────────────────
router.post("/scrape", async (req, res) => {
  const { searchQuery, maxLeads } = req.body;

  if (!searchQuery) {
    return res.status(400).json({ error: "searchQuery is required" });
  }

  try {
    res.json({
      message: `Scraping started for "${searchQuery}"`,
      status: "running",
    });

    const leads = await scrapeLinkedInLeads(
      searchQuery,
      maxLeads || 10,
      req.user.id,
    );
    console.log(`✅ Scrape complete — ${leads.length} leads saved`);
  } catch (err) {
    console.error("❌ Scrape failed:", err.message);
  }
});

// ── AI Generation ─────────────────────────────────────
router.post("/generate/:leadId", async (req, res) => {
  const { freelancerProfile } = req.body;

  if (!freelancerProfile) {
    return res.status(400).json({ error: "freelancerProfile is required" });
  }

  try {
    const message = await generateOutreachMessage(
      req.params.leadId,
      freelancerProfile,
      req.user.id,
    );
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/generate-bulk", async (req, res) => {
  const { freelancerProfile } = req.body;

  if (!freelancerProfile) {
    return res.status(400).json({ error: "freelancerProfile is required" });
  }

  try {
    const newLeads = await Lead.find({
      status: "new",
      userId: req.user.id,
    });

    if (newLeads.length === 0) {
      return res.json({ message: "No new leads to process", results: [] });
    }

    const leadIds = newLeads.map((lead) => lead._id);

    res.json({
      message: `Generating messages for ${leadIds.length} leads...`,
      status: "running",
      count: leadIds.length,
    });

    generateBulkMessages(leadIds, freelancerProfile, req.user.id).then(
      ({ results, errors }) => {
        console.log(`✅ Bulk complete: ${results.length} messages generated`);
        if (errors.length > 0) {
          console.log(`⚠️ Errors: ${errors.length}`);
        }
      },
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/regenerate/:messageId", async (req, res) => {
  const { freelancerProfile, customInstructions } = req.body;

  try {
    const message = await regenerateMessage(
      req.params.messageId,
      freelancerProfile,
      customInstructions,
    );
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Email Sending ─────────────────────────────────────
router.post("/send/:messageId", async (req, res) => {
  try {
    const result = await sendOutreachEmail(req.params.messageId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/send-bulk", async (req, res) => {
  try {
    const draftMessages = await Message.find({
      status: "draft",
      userId: req.user.id,
    });

    if (draftMessages.length === 0) {
      return res.json({ message: "No draft messages to send", results: [] });
    }

    const messageIds = draftMessages.map((m) => m._id);

    res.json({
      message: `Sending ${messageIds.length} emails...`,
      status: "running",
      count: messageIds.length,
    });

    sendBulkEmails(messageIds).then(({ results, errors }) => {
      console.log(`✅ Bulk send done: ${results.length} sent`);
      if (errors.length > 0) {
        console.log(`⚠️ Send errors: ${errors.length}`);
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/followup/:messageId", async (req, res) => {
  try {
    const result = await sendFollowUpEmail(req.params.messageId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Analytics ─────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const totalLeads = await Lead.countDocuments({ userId: req.user.id });
    const newLeads = await Lead.countDocuments({
      userId: req.user.id,
      status: "new",
    });
    const contacted = await Lead.countDocuments({
      userId: req.user.id,
      status: "contacted",
    });
    const replied = await Lead.countDocuments({
      userId: req.user.id,
      status: "replied",
    });
    const converted = await Lead.countDocuments({
      userId: req.user.id,
      status: "converted",
    });

    const totalMessages = await Message.countDocuments({ userId: req.user.id });
    const draftMessages = await Message.countDocuments({
      userId: req.user.id,
      status: "draft",
    });
    const sentMessages = await Message.countDocuments({
      userId: req.user.id,
      status: "sent",
    });
    const followUpsDue = await Message.countDocuments({
      userId: req.user.id,
      status: "sent",
      followUpSent: false,
      followUpDate: { $lte: new Date() },
    });

    res.json({
      leads: {
        total: totalLeads,
        new: newLeads,
        contacted,
        replied,
        converted,
      },
      messages: {
        total: totalMessages,
        draft: draftMessages,
        sent: sentMessages,
      },
      followUpsDue,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
