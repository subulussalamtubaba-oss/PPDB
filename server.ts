import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import { Applicant } from "./src/server/models/Applicant";
import dotenv from "dotenv";

dotenv.config();

let isConnected = false;
let isConnecting = false;

// Fallback in-memory storage for preview/development when MONGODB_URI is not set
let localApplicants: any[] = [];

async function getDBStatus(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return false;
  if (isConnected) return true;
  if (isConnecting) return false;

  try {
    isConnecting = true;
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    isConnected = true;
    console.log("Connected to MongoDB successfully");
    return true;
  } catch {
    isConnected = false;
    return false;
  } finally {
    isConnecting = false;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Status route to check storage engine
  app.get("/api/status", async (req, res) => {
    const hasUri = !!process.env.MONGODB_URI;
    const mongoConnected = await getDBStatus();
    res.json({
      hasUri,
      mongoConnected,
      storage: mongoConnected ? "mongodb" : "local",
    });
  });

  // API Routes
  app.get("/api/applicants", async (req, res) => {
    try {
      const isMongo = await getDBStatus();
      if (isMongo) {
        const applicants = await Applicant.find().sort({ createdAt: -1 });
        return res.json(applicants);
      }
      return res.json(localApplicants);
    } catch (err: any) {
      // Fallback to local on query failure
      return res.json(localApplicants);
    }
  });

  app.post("/api/applicants", async (req, res) => {
    try {
      const isMongo = await getDBStatus();
      if (isMongo) {
        const applicant = new Applicant(req.body);
        await applicant.save();
        return res.status(201).json(applicant);
      }
      const applicant = { ...req.body, createdAt: new Date().toISOString() };
      localApplicants.unshift(applicant);
      return res.status(201).json(applicant);
    } catch (err: any) {
      // If saving to Mongo failed, persist to local
      const applicant = { ...req.body, createdAt: new Date().toISOString() };
      localApplicants.unshift(applicant);
      return res.status(201).json(applicant);
    }
  });

  app.put("/api/applicants/:id", async (req, res) => {
    try {
      const isMongo = await getDBStatus();
      if (isMongo) {
        const applicant = await Applicant.findOneAndUpdate(
          { id: req.params.id },
          req.body,
          { new: true }
        );
        if (applicant) {
          return res.json(applicant);
        }
      }
      const idx = localApplicants.findIndex((a) => a.id === req.params.id);
      if (idx !== -1) {
        localApplicants[idx] = { ...localApplicants[idx], ...req.body };
        return res.json(localApplicants[idx]);
      }
      return res.status(404).json({ error: "Applicant not found" });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/applicants/:id", async (req, res) => {
    try {
      const isMongo = await getDBStatus();
      if (isMongo) {
        await Applicant.findOneAndDelete({ id: req.params.id });
      }
      localApplicants = localApplicants.filter((a) => a.id !== req.params.id);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/applicants/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ error: "Invalid payload" });
      }
      const isMongo = await getDBStatus();
      if (isMongo) {
        await Applicant.deleteMany({ id: { $in: ids } });
      }
      localApplicants = localApplicants.filter((a) => !ids.includes(a.id));
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/applicants/bulk-sync", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ error: "Invalid payload" });
      }
      const isMongo = await getDBStatus();
      if (isMongo) {
        await Applicant.updateMany(
          { id: { $in: ids } },
          { $set: { syncedToSheets: true } }
        );
      }
      localApplicants = localApplicants.map((a) =>
        ids.includes(a.id) ? { ...a, syncedToSheets: true } : a
      );
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
