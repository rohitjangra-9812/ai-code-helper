import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// In-memory admin state
let isLockdown = false;
const activityLogs: any[] = [];
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "core_aicodehelper_2026_portal";
const ADMIN_TOKEN = "secret-admin-token-12345";

// Additional mock state for new features
let mockUsers = [
  { id: "1", name: "Alice Smith", email: "alice@example.com", role: "user", status: "active", lastActive: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  { id: "2", name: "Bob Johnson", email: "bob@example.com", role: "user", status: "inactive", lastActive: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
  { id: "3", name: "Charlie Admin", email: "charlie@example.com", role: "admin", status: "active", lastActive: new Date(Date.now() - 1000 * 60).toISOString() },
];

let mockContent = [
  { id: "101", userId: "1", type: "report", content: "Bug in the python script generator", status: "pending", timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
  { id: "102", userId: "2", type: "feedback", content: "Love the fast response times!", status: "approved", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
];

let systemSettings = {
  maintenanceMode: false,
  apiLimitPerUser: 100,
  allowNewRegistrations: true,
};

function addLog(action: string, details: string) {
  activityLogs.unshift({ id: Date.now().toString() + Math.random().toString(), timestamp: new Date().toISOString(), action, details });
  if (activityLogs.length > 200) activityLogs.pop();
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/generate", async (req, res) => {
    try {
      if (isLockdown) {
        addLog("BLOCKED_ATTACK", "Generation blocked due to active lockdown.");
        return res.status(503).json({ error: "System is currently locked down for security reasons." });
      }

      if (systemSettings.maintenanceMode) {
        addLog("BLOCKED_MAINTENANCE", "Generation blocked due to maintenance mode.");
        return res.status(503).json({ error: "System is currently undergoing maintenance. Generation features are temporarily disabled." });
      }

      const reqPrompt = req.body.prompt || req.body.requirement;
      if (!reqPrompt) {
        return res.status(400).json({ success: false, error: "Prompt is required" });
      }

      addLog("GENERATE", `User requested code generation for: ${reqPrompt.substring(0, 50)}...`);

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: reqPrompt,
      });

      return res.status(200).json({
        success: true,
        result: response.text,
      });
    } catch (error: any) {
      console.error('API Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
      });
    }
  });



      // Admin endpoints
      app.post("/api/admin/login", (req, res) => {
        const { password } = req.body;
        if (password === ADMIN_PASSWORD) {
          addLog("ADMIN_LOGIN", "Admin logged in successfully.");
          res.json({ token: ADMIN_TOKEN });
        } else {
          addLog("ADMIN_LOGIN_FAILED", "Failed admin login attempt.");
          res.status(401).json({ error: "Unauthorized" });
        }
      });

      app.get("/api/admin/status", (req, res) => {
        if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(401).json({ error: "Unauthorized" });
        res.json({ isLockdown, logs: activityLogs });
      });

      app.post("/api/admin/lockdown", (req, res) => {
        if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(401).json({ error: "Unauthorized" });
        isLockdown = req.body.isLockdown;
        addLog("SYSTEM_ALERT", `Lockdown mode changed to: ${isLockdown}`);
        res.json({ success: true, isLockdown });
      });

      // User Management
      app.get("/api/admin/users", (req, res) => {
        if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(401).json({ error: "Unauthorized" });
        res.json({ users: mockUsers });
      });

      app.post("/api/admin/users/:id/status", (req, res) => {
        if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(401).json({ error: "Unauthorized" });
        const user = mockUsers.find(u => u.id === req.params.id);
        if (user) {
          user.status = req.body.status;
          addLog("USER_UPDATED", `User ${user.email} status changed to ${user.status}`);
          res.json({ success: true, user });
        } else {
          res.status(404).json({ error: "User not found" });
        }
      });

      // Content Moderation
      app.get("/api/admin/content", (req, res) => {
        if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(401).json({ error: "Unauthorized" });
        res.json({ content: mockContent });
      });

      app.post("/api/admin/content/:id/status", (req, res) => {
        if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(401).json({ error: "Unauthorized" });
        const item = mockContent.find(c => c.id === req.params.id);
        if (item) {
          item.status = req.body.status;
          addLog("CONTENT_MODERATED", `Content ${item.id} status changed to ${item.status}`);
          res.json({ success: true, item });
        } else {
          res.status(404).json({ error: "Content not found" });
        }
      });

      // Analytics
      app.get("/api/admin/analytics", (req, res) => {
        if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(401).json({ error: "Unauthorized" });
        res.json({ 
          totalUsers: mockUsers.length,
          activeUsers: mockUsers.filter(u => u.status === 'active').length,
          totalGenerations: activityLogs.filter(l => l.action === 'GENERATE').length,
          errorCount: activityLogs.filter(l => l.action.includes('FAILED') || l.action.includes('BLOCKED')).length,
        });
      });

      // Settings
      app.get("/api/admin/settings", (req, res) => {
        if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(401).json({ error: "Unauthorized" });
        res.json({ settings: systemSettings });
      });

      app.post("/api/admin/settings", (req, res) => {
        if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(401).json({ error: "Unauthorized" });
        systemSettings = { ...systemSettings, ...req.body };
        addLog("SETTINGS_UPDATED", "Global system settings updated");
        res.json({ success: true, settings: systemSettings });
      });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
