
import { GoogleGenAI } from "@google/genai";

// Initialize with the API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateProductAngle = async (
  base64Image: string,
  anglePrompt: string,
  userStylePrompt: string
): Promise<string | null> => {
  try {
    // Dynamically detect MIME type from the base64 string
    const mimeTypeMatch = base64Image.match(/^data:(image\/[a-zA-Z]+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
    const imageData = base64Image.split(',')[1];

    const combinedPrompt = `
      You are a professional smartphone photographer for an e-commerce marketplace.
      TASK: Take the provided source image and generate a NEW high-quality photograph from this angle: ${anglePrompt}
      STYLE: ${userStylePrompt || "Clean professional smartphone photo, natural lighting, realistic indoor background."}
      
      CRITICAL RULES:
      - Preserve the product's core identity (shape, color, texture).
      - Make it look like a real photo taken on a high-end smartphone (iPhone/Pixel).
      - Product should occupy 60-80% of the frame.
      - Sharp focus on the entire product.
      - Authentic shadows and realistic surface reflections.
      - No AI artifacts, no impossible geometry, no text/logos on background.
      - Single image output only.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: imageData,
              mimeType: mimeType,
            },
          },
          { text: combinedPrompt },
        ],
      },
    });

    // Safely iterate through parts to find the image data
    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }

    // Handle safety block or empty response
    if (candidate?.finishReason === 'SAFETY') {
      throw new Error("Generation blocked by safety filters. Try a different image or prompt.");
    }

    return null;
  } catch (error: any) {
    console.error("Gemini Generation Failure:", error);
    // Throw descriptive error messages for the UI
    if (error.message?.includes('429')) throw new Error("API Rate limit reached. Please wait a moment.");
    if (error.message?.includes('403')) throw new Error("Invalid API Key or permissions issue.");
    throw error;
  }
};
