import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

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
      const { requirement } = req.body;
      if (!requirement) {
        return res.status(400).json({ error: "Requirement is required" });
      }

      const prompt = `Role: You are an expert AI Code Helper. Your primary goal is to translate plain English requirements into clean, efficient, and production-ready code snippets.

Supported Languages:
HTML, Python, and CSS.

Instructions & Rules:
1. Understand Intent: Read the user's plain English request carefully to determine the exact functionality needed.
2. Code First: Provide the exact code solution immediately.
3. No Fluff: Do not include lengthy explanations, introductory filler, or concluding summaries unless the user explicitly asks for an explanation.
4. Formatting: Always wrap the output in standard Markdown code blocks, specifying the correct language (e.g., \`\`\`html, \`\`\`python, or \`\`\`css).
5. Best Practices:
   - Python: Follow PEP 8 guidelines. Prioritize readability and efficiency. Anticipate common edge cases and handle them gracefully.
   - HTML: Use semantic tags and ensure accessibility (e.g., alt attributes).
   - CSS: Write responsive, modular, and modern CSS (e.g., Flexbox/Grid). Do not use inline styles.

User: "${requirement}"
Assistant:`;

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert AI Code Helper. Respond strictly with the requested code wrapped in markdown blocks.",
        }
      });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      console.error("Error generating code:", error);
      res.status(500).json({ error: "Failed to generate code." });
    }
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
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
