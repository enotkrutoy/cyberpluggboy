import { GoogleGenAI } from "@google/genai";

// Standard way to initialize the SDK with process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateProductAngle = async (
  base64Image: string,
  anglePrompt: string,
  userStylePrompt: string
): Promise<string | null> => {
  try {
    // Precise extraction of data and mime type
    const parts = base64Image.split(',');
    if (parts.length < 2) throw new Error("Invalid image format");
    
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const imageData = parts[1];

    const combinedPrompt = `
      You are a world-class professional product photographer.
      OBJECTIVE: Generate a single, high-fidelity NEW photograph of the product in the provided image.
      CAMERA ANGLE: ${anglePrompt}
      ENVIRONMENTAL CONTEXT: ${userStylePrompt || "A clean, modern professional studio setting with soft natural light."}
      
      TECHNICAL SPECS:
      - Preserve ALL identifying marks, colors, and textures of the product.
      - Use high-end smartphone aesthetics (iPhone 15 Pro quality).
      - Realistic depth of field (bokeh).
      - Authentic shadows falling naturally on the surface.
      - The product MUST occupy 70% of the frame.
      - NO text, NO watermarks, NO impossible lighting.
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
          aspectRatio: "1:1"
        }
      }
    });

    const candidate = response.candidates?.[0];
    
    // Detailed error handling for Safety or Blocked content
    if (candidate?.finishReason === 'SAFETY') {
      throw new Error("Safety Block: The image or prompt was flagged. Please try a more neutral atmosphere.");
    }

    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("Empty Response: The AI failed to render an image part.");
  } catch (error: any) {
    console.error("Gemini Core Error:", error);
    
    // Map cryptic errors to user-friendly messages
    if (error.message?.includes('429')) {
      throw new Error("Rate Limit: The studio is busy. Please wait 10 seconds and try again.");
    }
    if (error.message?.includes('API_KEY')) {
      throw new Error("Auth Error: Missing or invalid API key configuration.");
    }
    
    throw error;
  }
};