import { GoogleGenAI } from "@google/genai";

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

export const extractTextFromImage = async (file: File): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const base64Data = await fileToBase64(file);

    const imagePart = {
        inlineData: {
            mimeType: file.type,
            data: base64Data,
        },
    };

    const textPart = {
        text: "You are an expert at optical character recognition. Extract all visible text from this image. Preserve formatting like paragraphs where possible. If there is no text, return an empty string."
    };
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error extracting text from image:", error);
        throw new Error("Failed to extract text from the image using the AI model.");
    }
};

export const extractTextFromTxt = (file: File): Promise<string> => {
    return file.text();
};
