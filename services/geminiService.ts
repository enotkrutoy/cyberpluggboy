
import { GoogleGenAI } from "@google/genai";

// Fix: Always use process.env.API_KEY directly when initializing the GoogleGenAI client.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateProductAngle = async (
  base64Image: string,
  anglePrompt: string,
  userStylePrompt: string
): Promise<string | null> => {
  try {
    const combinedPrompt = `
      You are a professional smartphone photographer for an e-commerce marketplace.
      TASK: Take the provided source image and generate a new high-quality photograph from a specific angle.
      ANGLE: ${anglePrompt}
      STYLE INSTRUCTIONS: ${userStylePrompt || "Clean professional smartphone photo, natural lighting, realistic indoor background."}
      
      CRITICAL RULES:
      - Preserve the product's core identity (shape, color, texture).
      - Make it look like a real photo taken on an iPhone/Smartphone.
      - Product should occupy 60-80% of the frame.
      - Sharp focus on the entire product.
      - Authentic shadows and realistic surface reflections.
      - No AI artifacts, no impossible geometry, no blurry edges.
      - Do NOT create a collage. Single image output.
    `;

    // Use ai.models.generateContent for image generation tasks with the gemini-2.5-flash-image model.
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1], // Remove prefix (e.g. "data:image/jpeg;base64,")
              mimeType: 'image/jpeg',
            },
          },
          { text: combinedPrompt },
        ],
      },
    });

    // Fix: Extract the image from the response parts. Do not assume it is the first part.
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    return null;
  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    throw error;
  }
};
