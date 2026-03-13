import { GoogleGenAI, Type } from "@google/genai";
import { Message } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SYSTEM_INSTRUCTION = `You are a data analysis assistant. 
When asked for data, always provide it in a structured JSON format if possible.
If the user asks for a report or dataset, include a JSON array of objects representing the data.
Format your response as follows:
1. A brief text summary.
2. A JSON block containing the data.

Example:
Here is the sales data for Q1.
\`\`\`json
[
  {"month": "Jan", "sales": 4500, "target": 4000},
  {"month": "Feb", "sales": 5200, "target": 4000},
  {"month": "Mar", "sales": 4800, "target": 4000}
]
\`\`\`

Always try to provide at least 5-10 rows of data for meaningful analysis.
Use realistic names and values.`;

export async function chatWithGemini(messages: { role: 'user' | 'model', parts: { text: string }[] }[]) {
  const model = "gemini-3.1-pro-preview";
  
  const response = await ai.models.generateContent({
    model,
    contents: messages,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    },
  });

  const text = response.text || "";
  
  // Extract JSON from the response
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\[\s*\{[\s\S]*?\}\s*\]/);
  let tableData: any[] | undefined;
  let cleanText = text;

  if (jsonMatch) {
    try {
      tableData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      cleanText = text.replace(jsonMatch[0], "").trim();
    } catch (e) {
      console.error("Failed to parse JSON from response", e);
    }
  }

  return {
    text: cleanText,
    tableData,
  };
}
