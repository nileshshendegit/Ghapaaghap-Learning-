export type GenerationType = 'qa' | 'concepts';

export interface Flashcard {
  question: string;
  answer: string;
  type: GenerationType;
  questionAudio?: string; // base64 encoded audio
  answerAudio?: string;   // base64 encoded audio
}
