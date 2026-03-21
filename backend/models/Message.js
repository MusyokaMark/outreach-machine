import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    status: {
      type: String,
      enum: ["draft", "sent", "opened", "replied", "bounced"],
      default: "draft",
    },
    sentAt: { type: Date, default: null },
    followUpDate: { type: Date, default: null },
    followUpSent: { type: Boolean, default: false },
    aiGenerated: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model("Message", MessageSchema);
