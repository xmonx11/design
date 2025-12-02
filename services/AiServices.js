import { GoogleGenAI } from "@google/genai";

// ⚠️ Security Warning: Do not store keys in plain text in production.
const API_KEY = process.env.EXPO_PUBLIC_AI_API_KEY; 
const ai = new GoogleGenAI({ apiKey: API_KEY });

export const getScheduleRecommendation = async (userTasks, userPrompt, imageBase64 = null) => {
  try {
    const currentDate = new Date();
    const dateString = currentDate.toDateString();
    const timeString = currentDate.toLocaleTimeString();

    // 1. Construct the System Instructions
    const systemInstruction = `
      You are a smart scheduling assistant.
      Current Date: ${dateString}, ${timeString}
      
      **Goal:** Analyze the user's request and optional image to find schedulable items.
      
      **Rules:**
      1. If an image is provided, extract all events, tasks, or deadlines from it.
      2. If multiple items are found, extract them all (Bulk Mode).
      3. Conflict Check: Avoid these existing busy times: ${JSON.stringify(userTasks.map(t => ({ start: t.date + ' ' + t.time, type: t.type })))}.
      
      **Output:**
      Return PURE JSON only. No Markdown formatting (no \`\`\`json).
      Your response must be a JSON object with a "tasks" key containing an array.
      
      Structure:
      {
        "tasks": [
          {
            "title": "String",
            "description": "String",
            "date": "YYYY-MM-DD",
            "time": "HH:MM AM/PM",
            "type": "Task" | "Meeting" | "Class" | "Work",
            "reason": "Why you chose this slot"
          }
        ]
      }
    `;

    // 2. Prepare Contents
    let contents = [];
    
    // Add text prompt
    contents.push({ text: userPrompt || "Analyze this image and schedule everything found." });

    // Add image if available
    if (imageBase64) {
      contents.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64
        }
      });
    }

    // 3. Generate Content
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: [
        {
            role: "user",
            parts: contents
        }
      ],
      config: {
        responseMimeType: "application/json",
        systemInstruction: systemInstruction,
      }
    });

    // 4. Clean and Parse Response
    let text = response.text; 
    console.log("Raw AI Response:", text);

    // Remove any markdown if present (just in case)
    if (text && typeof text === 'string') {
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    const result = JSON.parse(text);
    return result.tasks || []; // Always return an array

  } catch (error) {
    console.error("AI Service Error:", error);
    throw error;
  }
};