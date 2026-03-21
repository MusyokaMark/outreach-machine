import mongoose from "mongoose";

const LeadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    title: { type: String, default: "" },
    company: { type: String, default: "" },
    location: { type: String, default: "" },
    linkedinUrl: { type: String, default: "" },
    email: { type: String, default: "" },
    industry: { type: String, default: "" },
    status: {
      type: String,
      enum: ["new", "contacted", "replied", "converted", "ignored"],
      default: "new",
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.model("Lead", LeadSchema);
