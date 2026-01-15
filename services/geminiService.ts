import { GoogleGenAI } from "@google/genai";

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

export const generateProductAngle = async (
  base64Image: string,
  anglePrompt: string,
  userStylePrompt: string
): Promise<string | null> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("Google AI API Key is missing.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const parts = base64Image.split(',');
    if (parts.length < 2) throw new Error("Invalid image format.");
    
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const imageData = parts[1];

    const combinedPrompt = `
      ROLE: World-class Product Photographer for Marketplaces (Amazon, Ozon, Wildberries).
      TASK: Create an AUTHENTIC photo of the product from the source image at a NEW angle.
      NEW ANGLE: ${anglePrompt}
      ENVIRONMENT: ${userStylePrompt || "A realistic, high-quality domestic or commercial interior context. No plain white void."}
      
      STRICT PHOTOGRAPHY STANDARDS:
      - QUALITY: Must look like a high-end smartphone photo (iPhone 15 Pro quality). 
      - COMPOSITION: The product must occupy 60-80% of the frame. Sharp focus throughout.
      - AUTHENTICITY: Maintain 100% fidelity to the original product (shape, color, texture, labels). Do NOT add features.
      - LIGHTING: Natural, even lighting. Avoid harsh studio shadows. Subtle, realistic contact shadows on the surface.
      - NO COLLAGES: Generate exactly ONE single-view image. No split screens or contact sheets.
      - NO AI ARTIFACTS: Ensure clean edges, perfect geometry, and realistic textures. Avoid "over-polished" or "dreamy" AI looks.
      - RESOLUTION: High-detail, crisp textures as if shot with a 48MP mobile sensor.
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
      config: {
        imageConfig: {
          aspectRatio: "3:4" // Standard smartphone portrait aspect ratio for marketplaces
        }
      }
    });

    const candidate = response.candidates?.[0];
    
    if (candidate?.finishReason === 'SAFETY') {
      throw new Error("Content blocked for safety. Please check your source image.");
    }

    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("Failed to extract image result.");
  } catch (error: any) {
    console.error("Gemini Service Error:", error);
    
    if (error.message?.includes('429') || error.status === 429) {
      throw new RateLimitError("Rate Limit: The studio is busy. Please wait 10 seconds.");
    }
    
    throw error;
  }
};