import express from "express";
import voiceRouter from "./voice";
import "dotenv/config";

const app = express();
app.use("/api", voiceRouter);

const port = Number(process.env["PORT"] ?? "3000");
app.listen(port, () => console.log(`API OpenAI`));
