import Anthropic from "@anthropic-ai/sdk";
import Message from "../models/Message.js";
import Lead from "../models/Lead.js";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateOutreachMessage(leadId, freelancerProfile) {
  console.log(`Generating message for lead: ${leadId}`);

  // Fetch lead from database
  const lead = await Lead.findById(leadId);
  if (!lead) throw new Error("Lead not found");

  // Build the prompt
  const prompt = `
You are an expert cold outreach copywriter for freelancers.

Here is the freelancer's profile:
- Service: ${freelancerProfile.service}
- Skills: ${freelancerProfile.skills}
- Experience: ${freelancerProfile.experience}
- Past results: ${freelancerProfile.results}

Here is the potential client (lead) you are writing to:
- Name: ${lead.name}
- Job Title: ${lead.title}
- Company: ${lead.company}
- Location: ${lead.location}
- Industry: ${lead.industry || "Not specified"}

Your task:
Write a SHORT, personalized cold outreach email to this lead.

Rules:
1. Subject line must be specific and curiosity-driven — NOT generic
2. Email body must be under 120 words
3. Open with something specific about THEIR role or company
4. Mention ONE specific result the freelancer has achieved
5. End with a soft, low-pressure call to action
6. Sound human, warm and conversational — NOT salesy
7. Do NOT use buzzwords like "synergy", "leverage", "circle back"

Respond in this exact JSON format:
{
  "subject": "your subject line here",
  "body": "your email body here"
}

Return ONLY the JSON. No explanation, no extra text.
`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    // Parse the AI response
    const rawText = response.content[0].text.trim();
    const parsed = JSON.parse(rawText);

    // Save message to database
    const message = new Message({
      lead: leadId,
      subject: parsed.subject,
      body: parsed.body,
      status: "draft",
      aiGenerated: true,
    });

    await message.save();

    // Update lead status
    await Lead.findByIdAndUpdate(leadId, { status: "contacted" });

    console.log(`Message generated for ${lead.name}`);
    return message;
  } catch (err) {
    console.error("AI generation error:", err.message);
    throw err;
  }
}

export async function generateBulkMessages(leadIds, freelancerProfile) {
  console.log(`Generating messages for ${leadIds.length} leads...`);

  const results = [];
  const errors = [];

  for (const leadId of leadIds) {
    try {
      const message = await generateOutreachMessage(leadId, freelancerProfile);
      results.push(message);

      // Delay between API calls to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (err) {
      errors.push({ leadId, error: err.message });
    }
  }

  console.log(
    `Bulk generation complete: ${results.length} success, ${errors.length} errors`,
  );
  return { results, errors };
}

export async function regenerateMessage(
  messageId,
  freelancerProfile,
  customInstructions,
) {
  console.log(`🔄 Regenerating message: ${messageId}`);

  const existingMessage = await Message.findById(messageId).populate("lead");
  if (!existingMessage) throw new Error("Message not found");

  const lead = existingMessage.lead;

  const prompt = `
You are an expert cold outreach copywriter for freelancers.

Here is the freelancer's profile:
- Service: ${freelancerProfile.service}
- Skills: ${freelancerProfile.skills}
- Experience: ${freelancerProfile.experience}
- Past results: ${freelancerProfile.results}

Here is the potential client:
- Name: ${lead.name}
- Job Title: ${lead.title}
- Company: ${lead.company}
- Location: ${lead.location}

Previous message that needs improvement:
Subject: ${existingMessage.subject}
Body: ${existingMessage.body}

Custom instructions for the new version:
${customInstructions || "Make it more concise and compelling"}

Write an improved version following the same rules as before.

Respond ONLY in this JSON format:
{
  "subject": "your subject line here",
  "body": "your email body here"
}
`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const rawText = response.content[0].text.trim();
  const parsed = JSON.parse(rawText);

  // Update existing message
  existingMessage.subject = parsed.subject;
  existingMessage.body = parsed.body;
  await existingMessage.save();

  console.log(`Message regenerated for ${lead.name}`);
  return existingMessage;
}
