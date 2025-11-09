import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Flashcard, GenerationType } from '../types';

export const generateFlashcards = async (text: string, type: GenerationType): Promise<Flashcard[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let prompt: string;
  let responseSchema: any;

  if (type === 'concepts') {
    prompt = `You are an expert at creating study materials. Analyze the following text and generate a set of flashcards. For each card, identify a main topic, provide a concise summary (maximum 12 words), and list the key details as bullet points. Here is the text: \n\n"${text}"`;
    responseSchema = {
      type: Type.ARRAY,
      description: "A list of concept-based flashcards generated from the text.",
      items: {
        type: Type.OBJECT,
        properties: {
          topic: {
            type: Type.STRING,
            description: "The main topic or concept, in ALL CAPS.",
          },
          summary: {
            type: Type.STRING,
            description: "A concise summary of the topic, maximum 12 words.",
          },
          details: {
            type: Type.ARRAY,
            description: "Key details about the topic as an array of bullet points.",
            items: { type: Type.STRING }
          },
        },
        required: ["topic", "summary", "details"],
      },
    };
  } else { // 'qa' is the default
    prompt = `You are an expert at creating study materials. Analyze the following text and generate a set of flashcards. Each flashcard should have a clear question and a concise answer. Focus on the most important concepts, definitions, and key facts. Here is the text: \n\n"${text}"`;
    responseSchema = {
      type: Type.ARRAY,
      description: "A list of flashcards generated from the text.",
      items: {
        type: Type.OBJECT,
        properties: {
          question: {
            type: Type.STRING,
            description: "The question, term, or concept for the front of the flashcard.",
          },
          answer: {
            type: Type.STRING,
            description: "The answer, definition, or explanation for the back of the flashcard.",
          },
        },
        required: ["question", "answer"],
      },
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });
    
    const jsonString = response.text.trim();
    const rawCards = JSON.parse(jsonString);

    if (type === 'concepts') {
      return rawCards.map((card: { topic: string; summary: string; details: string[] }) => ({
        question: `${card.topic}||${card.summary}`, // Using a delimiter
        answer: `• ${card.details.join('\n• ')}`,
        type: 'concepts',
      }));
    } else { // Handles 'qa'
      return (rawCards as Omit<Flashcard, 'type'>[]).map(card => ({
        ...card,
        type: 'qa',
      }));
    }

  } catch (error) {
    console.error("Error generating flashcards:", error);
    throw new Error("Failed to generate flashcards. The AI model might have returned an invalid format.");
  }
};

export const generateSpeech = async (text: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }
  // Prevent API calls with empty text, which can cause errors.
  if (!text || !text.trim()) {
    return '';
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text.replace(/\|\|/g, '\n') }] }], // Clean up delimiter for speech
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // A neutral, clear voice
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const audioPart = response.candidates?.[0]?.content?.parts?.find(p => !!p.inlineData?.data);
    const base64Audio = audioPart?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("No audio data received from API.");
    }
    return base64Audio;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw new Error("Failed to generate audio for the text.");
  }
};