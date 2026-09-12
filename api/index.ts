import express from "express";
import mongoose from "mongoose";
import { Applicant } from "../src/server/models/Applicant.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

let isConnected = false;
async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return false;
  if (isConnected && mongoose.connection.readyState === 1) return true;

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    isConnected = true;
    return true;
  } catch (err) {
    console.error("MongoDB serverless connection error:", err);
    isConnected = false;
    return false;
  }
}

// Check status
app.get("/api/status", async (req, res) => {
  const mongoConnected = await connectDB();
  res.json({
    hasUri: !!process.env.MONGODB_URI,
    mongoConnected,
    storage: mongoConnected ? "mongodb" : "local",
  });
});

// GET /api/applicants
app.get("/api/applicants", async (req, res) => {
  try {
    const isMongo = await connectDB();
    if (isMongo) {
      const applicants = await Applicant.find().sort({ createdAt: -1 });
      return res.json(applicants);
    }
    return res.json([]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/applicants
app.post("/api/applicants", async (req, res) => {
  try {
    const isMongo = await connectDB();
    if (isMongo) {
      const applicant = new Applicant(req.body);
      await applicant.save();
      return res.status(201).json(applicant);
    }
    return res.status(201).json(req.body);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// PUT /api/applicants/:id
app.put("/api/applicants/:id", async (req, res) => {
  try {
    const isMongo = await connectDB();
    if (isMongo) {
      const applicant = await Applicant.findOneAndUpdate(
        { id: req.params.id },
        req.body,
        { new: true }
      );
      if (applicant) return res.json(applicant);
    }
    return res.status(404).json({ error: "Applicant not found" });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// DELETE /api/applicants/:id
app.delete("/api/applicants/:id", async (req, res) => {
  try {
    const isMongo = await connectDB();
    if (isMongo) {
      await Applicant.findOneAndDelete({ id: req.params.id });
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/applicants/bulk-delete
app.post("/api/applicants/bulk-delete", async (req, res) => {
  try {
    const { ids } = req.body;
    const isMongo = await connectDB();
    if (isMongo && Array.isArray(ids)) {
      await Applicant.deleteMany({ id: { $in: ids } });
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/applicants/bulk-sync
app.post("/api/applicants/bulk-sync", async (req, res) => {
  try {
    const { ids } = req.body;
    const isMongo = await connectDB();
    if (isMongo && Array.isArray(ids)) {
      await Applicant.updateMany(
        { id: { $in: ids } },
        { $set: { syncedToSheets: true } }
      );
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

export default app;
