// @google/genai guidelines: Create the GoogleGenAI instance inside the function using process.env.API_KEY.
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
      ROLE: Master Mobile Product Photographer for Marketplace Listings.
      TASK: Re-photograph the product from the source image at a NEW angle.
      NEW ANGLE: ${anglePrompt}
      ENVIRONMENT & VIBE: ${userStylePrompt || "A high-end, clean minimalist studio with soft natural light."}
      
      MOBILE PHOTOGRAPHY SPECS:
      - OPTICS: Simulate an f/1.8 smartphone primary lens (approx 24mm-35mm equivalent).
      - PROCESSING: Use "Computational Photography" style: subtle HDR, smart exposure, and natural texture sharpening.
      - BOKEH: Gentle, natural background blur as seen in high-end mobile "Portrait Mode".
      - FIDELITY: Maintain 100% accurate shape, color, branding, and materials of the source product. No additions or deletions to the product itself.
      - LIGHTING: Soft wrap-around natural light. Authentic contact shadows on the surface.
      - AESTHETIC: Look like an unedited, professionally shot photo from a flagship smartphone (e.g., iPhone 15 Pro, Pixel 8 Pro).
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
          aspectRatio: "3:4"
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
    
    // Check for 429 Rate Limit error
    if (error.message?.includes('429') || error.status === 429) {
      throw new RateLimitError("Rate Limit: The studio is busy. Please wait 10 seconds.");
    }
    
    throw error;
  }
};