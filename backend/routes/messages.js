import express from "express";
import Message from "../models/Message.js";
import { verifyToken } from "../services/auth.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", async (req, res) => {
  try {
    const messages = await Message.find({ userId: req.user.id })
      .populate("lead", "name company email")
      .sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/lead/:leadId", async (req, res) => {
  try {
    const messages = await Message.find({
      lead: req.params.leadId,
      userId: req.user.id,
    }).sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const message = new Message({ ...req.body, userId: req.user.id });
    await message.save();
    res.status(201).json(message);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const message = await Message.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true },
    );
    res.json(message);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
