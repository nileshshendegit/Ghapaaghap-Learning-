import React from 'react';
import { HistoryItem } from '../utils/historyUtils';

interface HistoryProps {
  history: HistoryItem[];
  onLoadItem: (item: HistoryItem) => void;
  onClearHistory: () => void;
  onClose: () => void;
}

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);
  

export const History: React.FC<HistoryProps> = ({ history, onLoadItem, onClearHistory, onClose }) => {
  if (!history || history.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-gray-800 p-8 rounded-lg max-w-lg w-full relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
                <XIcon />
            </button>
            <h2 className="text-2xl font-bold mb-4 text-white">My Flashcards</h2>
            <p className="text-gray-400">Your history is empty. Generate some flashcards to see them here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-6 rounded-lg max-w-2xl w-full relative flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
          <XIcon />
        </button>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">My Flashcards</h2>
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to clear your entire history? This cannot be undone.")) {
                onClearHistory();
              }
            }}
            className="text-sm bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
          >
            Clear History
          </button>
        </div>
        <div className="overflow-y-auto space-y-3 pr-2">
            {history.map(item => (
                <div key={item.id} className="bg-gray-700 p-4 rounded-md hover:bg-gray-600 transition-colors">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-grow min-w-0">
                            <p className="text-sm text-gray-400">
                                {new Date(item.timestamp).toLocaleString()} - {item.cards.length} cards
                            </p>
                            <p className="font-semibold text-white mt-1 break-words">
                                {item.sourceText}
                            </p>
                        </div>
                        <button 
                            onClick={() => onLoadItem(item)}
                            className="ml-4 flex-shrink-0 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                        >
                            Load
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};
