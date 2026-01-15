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
      ROLE: World-class Product Photographer for Elite Marketplaces.
      TASK: Generate a high-fidelity, professional photo of the EXACT product from the source image.
      NEW ANGLE: ${anglePrompt}
      ENVIRONMENT: ${userStylePrompt || "A realistic, high-quality domestic or commercial interior context."}
      
      STRICT PHOTOGRAPHY STANDARDS:
      - QUALITY: High-end mobile photography (iPhone 15 Pro, HDR, f/1.8). 
      - COMPOSITION: Product MUST occupy 60-80% of the frame. Vertical 3:4 aspect ratio.
      - FIDELITY: 100% accurate shape, color, and labels. Do NOT hallucinate new features.
      - TEXT/LOGOS: Maintain all text, branding, and small details exactly as seen in source. 
      - LIGHTING: Soft natural daylight with subtle global illumination. No harsh artificial shadows.
      - FINISH: Crisp, sharp textures with realistic micro-imperfections. No "AI smooth" effect.
      - OUTPUT: Single photo only. No collages, no watermarks, no split views.
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
      throw new Error("Content blocked for safety. Use a clear product image.");
    }

    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("Engine returned no visual data.");
  } catch (error: any) {
    console.error("Gemini Engine Failure:", error);
    
    if (error.message?.includes('429') || error.status === 429) {
      throw new RateLimitError("Rate Limit exceeded.");
    }
    
    throw error;
  }
};