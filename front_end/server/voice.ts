import express from "express";
import multer from "multer";
import OpenAI, { toFile } from "openai";
import { Readable } from "node:stream";
import "dotenv/config";

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

const openai = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"]! });

/**
 * POST /api/voice-reply
 * form-data:
 *  - file: <audio webm/ogg>
 *  - instructions: <string> (opzionale, prompt di sistema)
 */
router.post("/voice-reply", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("file mancante");
    }
    if (!process.env["OPENAI_API_KEY"]) {
      return res.status(500).send("Chiave API non configurata");
    }

    const instructions =
      (req.body?.instructions as string) ||
      "Sei un assistente vocale conciso. Rispondi in italiano in 1-2 frasi.";

    // Trascrizione (STT)
    const tr = await openai.audio.transcriptions.create({
      file: await toFile(
        req.file.buffer,
        req.file.originalname || "audio.webm"
      ),
      model: "gpt-4o-transcribe",
      language: "it",
    });
    const userText = tr.text ?? "";

    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: userText || "Nessun testo dalla trascrizione." },
      ],
      temperature: 0.7,
    });
    const replyText =
      chat.choices?.[0]?.message?.content?.trim() ||
      "Ho ricevuto il tuo messaggio, ma non sono riuscito a generare una risposta.";

    // TTS in streaming
    const ttsResp = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env["OPENAI_API_KEY"]}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "alloy",
        input: replyText,
        format: "mp3",
      }),
    });

    if (!ttsResp.ok || !ttsResp.body) {
      const err = await ttsResp.text();
      return res.status(500).send(err);
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Transfer-Encoding", "chunked");

    Readable.fromWeb(ttsResp.body as any).pipe(res);
    return res.status(200);
  } catch (e) {
    console.error(e);
    return res.status(500).send("server_error");
  }
});

export default router;
