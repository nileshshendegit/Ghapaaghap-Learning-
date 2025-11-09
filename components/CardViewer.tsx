import React from 'react';
import type { Flashcard } from '../types';
import { FlashcardComponent } from './Flashcard';

interface CardViewerProps {
  cards: Flashcard[];
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  autoReadBack: boolean;
  isPreloadingAudio: boolean;
}

const ChevronLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
);


export const CardViewer: React.FC<CardViewerProps> = ({ 
    cards, 
    currentIndex, 
    setCurrentIndex, 
    autoReadBack,
    isPreloadingAudio
}) => {
  const handlePrev = () => {
    setCurrentIndex(Math.max(0, currentIndex - 1));
  };

  const handleNext = () => {
    setCurrentIndex(Math.min(cards.length - 1, currentIndex + 1));
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
      <div className="w-full mb-4">
        <FlashcardComponent 
            key={currentIndex}
            card={cards[currentIndex]} 
            autoReadBack={autoReadBack}
            isPreloadingAudio={isPreloadingAudio}
        />
      </div>
      <div className="flex items-center justify-between w-full px-4 sm:px-0">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="p-3 rounded-full bg-gray-700 hover:bg-indigo-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
        >
          <ChevronLeftIcon />
        </button>
        <p className="text-lg font-medium text-gray-300">
          {currentIndex + 1} / {cards.length}
        </p>
        <button
          onClick={handleNext}
          disabled={currentIndex === cards.length - 1}
          className="p-3 rounded-full bg-gray-700 hover:bg-indigo-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
        >
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  );
};