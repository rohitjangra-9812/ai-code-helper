import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  const response = await ai.models.generateContent({
    model: 'gemini-pro-latest',
    contents: 'Hello'
  });
  console.log(response.text);
}
run().catch(console.error);
