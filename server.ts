import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Enable CORS for Android Capacitor (capacitor://localhost, http://localhost) and cross-origin clients
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

// Helper to wrap 16-bit mono PCM into standard WAV buffer
function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmBuffer]);
}

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

    let text = "";
    const modelsToTry = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-3.8-flash"];
    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        if (response.text && response.text.trim()) {
          text = response.text.trim();
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} returned error in search, trying fallback:`, err?.message);
      }
    }

    if (!text) {
      text = "Não foi possível gerar uma resposta no momento. Por favor, tente novamente.";
    }

    res.json({ result: text, query, mode });
  } catch (error: any) {
    console.error("Erro na chamada Gemini:", error);
    res.status(500).json({
      error: error?.message || "Ocorreu um erro ao processar a pesquisa com Gemini.",
    });
  }
});

// Clean text helper when offline or during Gemini API demand spikes
function cleanTextForSpeech(text: string, mode: "read" | "summary"): string {
  let cleaned = text
    .replace(/^#+\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/^[-*+]\s+/gm, "• ")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/https?:\/\/\S+/gi, "link")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (mode === "summary") {
    const sentences = cleaned
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15);
    if (sentences.length > 3) {
      return `Resumo da nota: ${sentences.slice(0, 3).join(" ")}`;
    }
  }
  return cleaned;
}

// Endpoint para preparar o conteúdo da nota para locução e leitura em voz alta com IA Gemini
app.post("/api/gemini/read-note", async (req: Request, res: Response): Promise<void> => {
  const { content, mode = "read", voice = "Aoede", generateAudio = false } = req.body;
  if (!content || typeof content !== "string" || !content.trim()) {
    res.status(400).json({ error: "O conteúdo da nota está vazio para leitura." });
    return;
  }

  let preparedText = "";
  let audioBase64: string | null = null;

  try {
    const ai = getGeminiClient();
    let prompt = "";
    let systemInstruction = "";

    if (mode === "summary") {
      systemInstruction =
        "Você é o leitor de voz oficial do Bloco de Notas Android. Seu papel é resumir em voz alta em português brasileiro os pontos mais importantes da nota para quem está ouvindo. Seja direto, fale como um locutor amigável, sem metatexto, sem introduções como 'Aqui está o resumo'. Vá direto ao que deve ser falado.";
      prompt = `Crie um resumo falado de 2 a 4 frases claras e naturais para ser ouvido em áudio desta nota:\n\n${content.slice(0, 10000)}`;
    } else {
      systemInstruction =
        "Você é o locutor narrador oficial do Bloco de Notas Android. Seu papel é ler e vocalizar o texto da nota com perfeita dicção em português brasileiro. Adapte o texto para a fala: retire códigos de formatação, URLs brutas, asteriscos ou marcadores técnicos que soem estranhos quando ouvidos em áudio, preservando absolutamente todo o sentido e a integridade da nota. NUNCA faça comentários, cumprimentos ou introduções. Entregue unicamente o texto que a voz deve falar.";
      prompt = `Leia e vocalize em formato de locução fluida o conteúdo da seguinte nota:\n\n${content.slice(0, 10000)}`;
    }

    // Try models in order: gemini-3.6-flash -> gemini-flash-latest -> gemini-3.1-flash-lite -> gemini-3.8-flash
    const modelsToTry = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-3.8-flash"];
    let aiSuccess = false;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.3,
          },
        });
        if (response.text && response.text.trim()) {
          preparedText = response.text.trim();
          aiSuccess = true;
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} returned error in read-note, trying fallback:`, err?.message);
      }
    }

    if (!aiSuccess) {
      preparedText = cleanTextForSpeech(content, mode);
    }

    // Optional native Gemini neural voice audio generation
    if (generateAudio) {
      try {
        const textToSpeak = (preparedText || content).slice(0, 1500);
        const ttsResponse = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: `Leia exatamente o seguinte texto em áudio: ${textToSpeak}`,
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voice || "Aoede",
                },
              },
            },
          },
        });

        const inline = ttsResponse.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        if (inline?.inlineData?.data) {
          const rawPcm = Buffer.from(inline.inlineData.data, "base64");
          const wav = pcmToWav(rawPcm, 24000);
          audioBase64 = `data:audio/wav;base64,${wav.toString("base64")}`;
        }
      } catch (ttsErr: any) {
        console.warn("Gemini TTS audio generation fallback:", ttsErr?.message);
      }
    }

    res.json({ preparedText, mode, voice, audioBase64 });
  } catch (error: any) {
    console.error("Erro na leitura Gemini:", error);
    // Even if Gemini client threw, return cleaned text with 200 so UI NEVER fails
    const fallbackText = cleanTextForSpeech(content, mode);
    res.json({ preparedText: fallbackText, mode, voice, audioBase64: null });
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
