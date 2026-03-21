import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true,
});

export const getLeads = () => API.get("/leads");
export const updateLead = (id, data) => API.patch("/leads/" + id, data);
export const deleteLead = (id) => API.delete("/leads/" + id);

export const getMessages = () => API.get("/messages");
export const updateMessage = (id, data) => API.patch("/messages/" + id, data);

export const scrapeLeads = (data) => API.post("/outreach/scrape", data);
export const generateMsg = (leadId, prof) =>
  API.post("/outreach/generate/" + leadId, { freelancerProfile: prof });
export const generateBulk = (prof) =>
  API.post("/outreach/generate-bulk", { freelancerProfile: prof });
export const sendEmail = (msgId) => API.post("/outreach/send/" + msgId);
export const sendBulk = () => API.post("/outreach/send-bulk");
export const getStats = () => API.get("/outreach/stats");
export const regenerateMsg = (msgId, prof, instructions) =>
  API.post("/outreach/regenerate/" + msgId, {
    freelancerProfile: prof,
    customInstructions: instructions,
  });
