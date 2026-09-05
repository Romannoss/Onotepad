var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "15mb" }));
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY n\xE3o foi configurada no ambiente do servidor.");
  }
  return new import_genai.GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", version: "3.0" });
});
app.post("/api/gemini/search", async (req, res) => {
  try {
    const { query, context, mode = "search" } = req.body;
    if (!query || typeof query !== "string" || !query.trim()) {
      res.status(400).json({ error: "O termo de pesquisa ou pergunta \xE9 obrigat\xF3rio." });
      return;
    }
    const ai = getGeminiClient();
    let systemInstruction = "Voc\xEA \xE9 o assistente inteligente integrado ao Bloco de Notas Android v3.0. Responda sempre em portugu\xEAs brasileiro de forma direta, clara, bem estruturada e pronta para ser inserida ou consultada em notas pessoais. Use formata\xE7\xE3o Markdown simples (t\xF3picos com \u2022, negrito **texto**, t\xEDtulos se apropriado).";
    let prompt = "";
    if (mode === "summarize") {
      prompt = `Por favor, resuma os seguintes pontos principais da nota ou texto:

${context || query}`;
    } else if (mode === "expand") {
      prompt = `Por favor, elabore detalhadamente e forne\xE7a informa\xE7\xF5es completas sobre:

${query}${context ? `

Contexto da nota atual:
${context}` : ""}`;
    } else if (mode === "fix") {
      prompt = `Por favor, revise a ortografia, pontua\xE7\xE3o e clareza do seguinte texto em portugu\xEAs, mantendo a mensagem original e explicando brevemente as corre\xE7\xF5es:

${query}`;
    } else {
      prompt = `Pesquise e explique com precis\xE3o o seguinte assunto para salvar no bloco de notas:

${query}${context ? `

Contexto da nota:
${context}` : ""}`;
    }
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7
      }
    });
    const text = response.text || "Nenhuma resposta foi gerada.";
    res.json({ result: text, query, mode });
  } catch (error) {
    console.error("Erro na chamada Gemini:", error);
    res.status(500).json({
      error: error?.message || "Ocorreu um erro ao processar a pesquisa com Gemini."
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor Bloco de Notas Android v3.0 rodando na porta ${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
