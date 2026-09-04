import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Lazy/safe initialization of Gemini AI
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não foi configurada no ambiente do servidor.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", version: "3.0" });
});

// Gemini Search & AI Assistant endpoint
app.post("/api/gemini/search", async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, context, mode = "search" } = req.body;

    if (!query || typeof query !== "string" || !query.trim()) {
      res.status(400).json({ error: "O termo de pesquisa ou pergunta é obrigatório." });
      return;
    }

    const ai = getGeminiClient();

    let systemInstruction =
      "Você é o assistente inteligente integrado ao Bloco de Notas Android v3.0. " +
      "Responda sempre em português brasileiro de forma direta, clara, bem estruturada e pronta para ser inserida ou consultada em notas pessoais. " +
      "Use formatação Markdown simples (tópicos com •, negrito **texto**, títulos se apropriado).";

    let prompt = "";
    if (mode === "summarize") {
      prompt = `Por favor, resuma os seguintes pontos principais da nota ou texto:\n\n${context || query}`;
    } else if (mode === "expand") {
      prompt = `Por favor, elabore detalhadamente e forneça informações completas sobre:\n\n${query}${
        context ? `\n\nContexto da nota atual:\n${context}` : ""
      }`;
    } else if (mode === "fix") {
      prompt = `Por favor, revise a ortografia, pontuação e clareza do seguinte texto em português, mantendo a mensagem original e explicando brevemente as correções:\n\n${query}`;
    } else {
      // General search / research
      prompt = `Pesquise e explique com precisão o seguinte assunto para salvar no bloco de notas:\n\n${query}${
        context ? `\n\nContexto da nota:\n${context}` : ""
      }`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const text = response.text || "Nenhuma resposta foi gerada.";
    res.json({ result: text, query, mode });
  } catch (error: any) {
    console.error("Erro na chamada Gemini:", error);
    res.status(500).json({
      error: error?.message || "Ocorreu um erro ao processar a pesquisa com Gemini.",
    });
  }
});

async function startServer() {
  // Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor Bloco de Notas Android v3.0 rodando na porta ${PORT}`);
  });
}

startServer();
