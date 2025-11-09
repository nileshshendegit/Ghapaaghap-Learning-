import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Flashcard } from '../types';
import { generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';

interface FlashcardComponentProps {
  card: Flashcard;
  autoReadBack: boolean;
  isPreloadingAudio: boolean;
}

const SpeakerWaveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
    </svg>
);

const AudioWaveformLoader = () => (
    <div className="flex items-center justify-center space-x-1 h-6 w-6">
        <div className="waveform-bar w-1 h-3 bg-white" style={{ animationDelay: '0s' }}></div>
        <div className="waveform-bar w-1 h-5 bg-white" style={{ animationDelay: '0.2s' }}></div>
        <div className="waveform-bar w-1 h-3 bg-white" style={{ animationDelay: '0.4s' }}></div>
    </div>
);

export const FlashcardComponent: React.FC<FlashcardComponentProps> = ({ 
    card, 
    autoReadBack,
    isPreloadingAudio
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [speakingSide, setSpeakingSide] = useState<'question' | 'answer' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  const operationIdRef = useRef(0);

  const stopAudio = useCallback(() => {
    if (audioSourceRef.current) {
      audioSourceRef.current.onended = null;
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
    }
    operationIdRef.current += 1;
    setSpeakingSide(null);
  }, []);

  useEffect(() => {
    setIsFlipped(false);
    return () => {
      stopAudio();
    };
  }, [card, stopAudio]);

  const playAudio = useCallback(async (
    text: string, 
    preloadedAudio: string | undefined, 
    side: 'question' | 'answer', 
    onEndCallback?: () => void
  ) => {
    stopAudio();
    const currentOperationId = operationIdRef.current;

    setSpeakingSide(side);
    setError(null);

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const base64Audio = preloadedAudio ?? await generateSpeech(text);
      if (operationIdRef.current !== currentOperationId) return;

      const audioData = decode(base64Audio);
      const audioBuffer = await decodeAudioData(audioData, audioContextRef.current, 24000, 1);
      if (operationIdRef.current !== currentOperationId) return;

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        if (audioSourceRef.current === source && operationIdRef.current === currentOperationId) {
          setSpeakingSide(null);
          audioSourceRef.current = null;
          onEndCallback?.();
        }
      };

      source.start(0);
      audioSourceRef.current = source;

    } catch (err) {
      if (operationIdRef.current === currentOperationId) {
        console.error("Failed to play audio:", err);
        setError("Could not play audio.");
        setSpeakingSide(null);
      }
    }
  }, [stopAudio]);

  const handleFlip = () => {
    if (speakingSide) return;
    stopAudio();
    setIsFlipped(prev => !prev);
  };
  
  const handleReadAloudClick = useCallback((e: React.MouseEvent, side: 'question' | 'answer') => {
      e.stopPropagation();

      if (speakingSide === side) {
          stopAudio();
      } else {
        if (side === 'question' && autoReadBack) {
            playAudio(card.question, card.questionAudio, 'question', () => {
                setIsFlipped(true);
                setTimeout(() => playAudio(card.answer, card.answerAudio, 'answer'), 200);
            });
        } else {
            const text = side === 'question' ? card.question : card.answer;
            const preloadedAudio = side === 'question' ? card.questionAudio : card.answerAudio;
            playAudio(text, preloadedAudio, side);
        }
      }
  }, [speakingSide, stopAudio, autoReadBack, card, playAudio]);

  const isQuestionAudioReady = !!card.questionAudio;
  const isAnswerAudioReady = !!card.answerAudio;
  
  const isConceptCard = card.type === 'concepts';
  let conceptTopic: string | undefined;
  let conceptSummary: string | undefined;

  if (isConceptCard && card.question.includes('||')) {
    [conceptTopic, conceptSummary] = card.question.split('||');
  }

  return (
    <div
      className={`w-full rounded-2xl [perspective:1000px] ${!speakingSide ? 'cursor-pointer' : 'cursor-default'}`}
      onClick={handleFlip}
      title={!speakingSide ? "Click to flip" : ""}
    >
      <div className={`w-full [transform-style:preserve-3d] transition-transform duration-700 ease-in-out grid ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
        {/* Front of card */}
        <div className="[grid-area:1/1] relative w-full min-h-[25rem] [backface-visibility:hidden] bg-gray-700 border-2 border-gray-600 rounded-2xl p-6 pb-16 flex flex-col justify-center items-center text-center">
          <div className="flex-grow flex items-center justify-center p-2">
            <div>
              {isConceptCard && conceptTopic ? (
                <>
                  <p className="text-sm font-semibold text-indigo-400 mb-2">CONCEPT</p>
                  <p className="text-2xl font-bold text-white uppercase">{conceptTopic}</p>
                  {conceptSummary && <p className="text-lg text-gray-300 mt-4">{conceptSummary}</p>}
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-indigo-400 mb-2">QUESTION</p>
                  <p className="text-2xl font-bold text-white">{card.question}</p>
                </>
              )}
            </div>
          </div>
          <div className="absolute bottom-4 right-4 flex items-center">
            {isPreloadingAudio && !isQuestionAudioReady && (
              <p className="text-xs text-gray-400 animate-pulse mr-2">Loading...</p>
            )}
            <button 
              onClick={(e) => handleReadAloudClick(e, 'question')}
              disabled={!isQuestionAudioReady}
              className={`p-2 rounded-full transition-colors duration-300
                ${isQuestionAudioReady 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-gray-600 cursor-not-allowed'
                }`
              }
              title={isQuestionAudioReady 
                ? (speakingSide === 'question' ? "Stop reading" : "Read aloud")
                : "Audio is loading..."}
            >
              {speakingSide === 'question' ? <AudioWaveformLoader /> : <SpeakerWaveIcon />}
            </button>
          </div>
        </div>

        {/* Back of card */}
        <div className="[grid-area:1/1] relative w-full min-h-[25rem] [backface-visibility:hidden] bg-indigo-900 border-2 border-indigo-500 rounded-2xl p-6 pb-16 flex flex-col justify-center items-center text-center [transform:rotateY(180deg)]">
           <div className="flex-grow flex items-center justify-center p-2">
            <div className="text-left w-full">
                <p className="text-sm font-semibold text-indigo-300 mb-2 text-center">
                  {isConceptCard ? 'DETAILS' : 'ANSWER'}
                </p>
                <p className="text-xl text-gray-200 whitespace-pre-line">{card.answer}</p>
                {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}
            </div>
          </div>
           <div className="absolute bottom-4 right-4 flex items-center">
             {isPreloadingAudio && !isAnswerAudioReady && (
                <p className="text-xs text-gray-400 animate-pulse mr-2">Loading...</p>
              )}
             <button 
              onClick={(e) => handleReadAloudClick(e, 'answer')}
              disabled={!isAnswerAudioReady}
              className={`p-2 rounded-full transition-colors duration-300
                ${isAnswerAudioReady 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-gray-600 cursor-not-allowed'
                }`
              }
              title={isAnswerAudioReady 
                ? (speakingSide === 'answer' ? "Stop reading" : "Read aloud")
                : "Audio is loading..."}
            >
              {speakingSide === 'answer' ? <AudioWaveformLoader /> : <SpeakerWaveIcon />}
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};
