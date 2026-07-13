import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Lazy-loaded Gemini client
let ai: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set. Please add it to Settings > Secrets in AI Studio.");
    }
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return ai;
}

async function bootstrap() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy" });
  });

  // API endpoint to execute a single agent block using Gemini
  app.post("/api/run-agent", async (req, res) => {
    try {
      const { prompt, systemInstruction, model, temperature } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Missing required parameter: prompt" });
      }

      const client = getGeminiClient();
      const modelToUse = model || "gemini-3.5-flash";

      const response = await client.models.generateContent({
        model: modelToUse,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction || undefined,
          temperature: typeof temperature === "number" ? temperature : 0.7,
        },
      });

      const text = response.text || "No response received from agent.";
      
      // Calculate token counts from usage metadata or fallback estimates
      const promptTokens = response.usageMetadata?.promptTokenCount || Math.ceil(prompt.length / 4.2);
      const completionTokens = response.usageMetadata?.candidatesTokenCount || Math.ceil(text.length / 4.2);
      
      // Model Pricing per 1M tokens:
      // gemini-3.5-flash: $0.075 Input / $0.30 Output
      // gemini-3.1-pro-preview / gemini-pro: $1.25 Input / $5.00 Output
      let cost = 0;
      if (modelToUse.toLowerCase().includes("pro")) {
        cost = (promptTokens * 1.25 + completionTokens * 5.00) / 1000000;
      } else {
        cost = (promptTokens * 0.075 + completionTokens * 0.30) / 1000000;
      }

      res.json({
        text,
        metrics: {
          promptTokens,
          completionTokens,
          cost,
        }
      });
    } catch (error: any) {
      console.error("Error running agent:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // Suggest prompt settings for an agent
  app.post("/api/suggest-prompt", async (req, res) => {
    try {
      const { role, description } = req.body;
      const client = getGeminiClient();

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `You are an AI Multi-Agent Architect.
Provide an optimized system instruction prompt for an AI agent playing a specific role.

Agent Role: ${role || "General Assistant"}
Agent Goal/Description: ${description || "Help execute tasks"}

Rules:
1. Write in the second person ("You are...").
2. Specify analytical guidelines, output formats, and standard guardrails.
3. Keep it professional, structured, and under 150 words.
4. Output ONLY the optimized prompt content. Do not include markdown blocks, introductory words, or conversational filler.`,
      });

      res.json({ prompt: response.text ? response.text.trim() : "" });
    } catch (error: any) {
      console.error("Error suggesting prompt:", error);
      res.status(500).json({ error: error.message || "Failed to generate prompt suggestion" });
    }
  });

  // Vite middleware for dev mode & static folder serving for production mode
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to bootstrap server:", err);
});
