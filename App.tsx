import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CardViewer } from './components/CardViewer';
import { History } from './components/History';
import { generateFlashcards, generateSpeech } from './services/geminiService';
import { extractTextFromImage, extractTextFromTxt } from './services/scrapingService';
import type { Flashcard, GenerationType } from './types';
import type { HistoryItem } from './utils/historyUtils';
import { loadHistory, saveHistory, clearHistory as clearHistoryUtil } from './utils/historyUtils';
import { exportToPdf, exportToText } from './utils/exportUtils';


// Icons
const BookOpenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 16c1.255 0 2.443-.29 3.5-.804V4.804zM14.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 0114.5 16c1.255 0 2.443-.29 3.5-.804v-10A7.968 7.968 0 0014.5 4z" />
  </svg>
);
const DocumentTextIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
    </svg>
);
const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);
const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2l4.473 1.118a1 1 0 01.381 1.932l-3.323 2.375.98 4.783a1 1 0 01-1.48 1.054L12 15.69l-3.178 2.76a1 1 0 01-1.48-1.054l.98-4.783-3.323-2.375a1 1 0 01.381-1.932L8.854 7.2 10.033 2.744A1 1 0 0112 2z" clipRule="evenodd" />
    </svg>
);

const App: React.FC = () => {
  const [sourceText, setSourceText] = useState<string>('');
  const [generationType, setGenerationType] = useState<GenerationType>('qa');
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [autoReadBack, setAutoReadBack] = useState(false);
  const [isPreloadingAudio, setIsPreloadingAudio] = useState(false);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const preloadAudioForCards = useCallback(async (cardsToPreload: Flashcard[]) => {
    setIsPreloadingAudio(true);
    
    const audioPromises = cardsToPreload.map(async (card, index) => {
        const questionAudio = await generateSpeech(card.question);
        const answerAudio = await generateSpeech(card.answer);
        return { ...card, questionAudio, answerAudio, index };
    });

    for (const promise of audioPromises) {
        try {
          const { index, questionAudio, answerAudio } = await promise;
          setCards(currentCards => {
            const newCards = [...currentCards];
            if (newCards[index]) {
              newCards[index] = { ...newCards[index], questionAudio, answerAudio };
            }
            return newCards;
          });
        } catch (audioError) {
            console.error(`Failed to generate audio for card`, audioError);
            // Continue preloading other cards
        }
    }
    setIsPreloadingAudio(false);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!sourceText.trim()) {
      setError("Please enter some text or upload a file to generate flashcards.");
      return;
    }
    setIsLoading(true);
    setLoadingMessage('Generating flashcards...');
    setError(null);
    setCards([]);
    setCurrentIndex(0);

    try {
      const generatedCards = await generateFlashcards(sourceText, generationType);
      if (generatedCards.length === 0) {
        setError("The model didn't generate any flashcards. Try refining your text or check the model's response.");
        setIsLoading(false);
        return;
      }
      setCards(generatedCards);
      const newHistory = saveHistory(sourceText, generatedCards, generationType);
      setHistory(newHistory);
      
      setIsLoading(false);

      // Fire and forget promise to not block the UI
      preloadAudioForCards(generatedCards);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
      setIsLoading(false);
    }
  }, [sourceText, generationType, preloadAudioForCards]);
  
  const processFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setLoadingMessage('Processing file...');
    setError(null);
    setSourceText('');

    try {
        let text = '';
        if (file.type.startsWith('image/')) {
            text = await extractTextFromImage(file);
        } else if (file.type === 'text/plain') {
            text = await extractTextFromTxt(file);
        } else {
            throw new Error('Unsupported file type. Please upload an image or a .txt file.');
        }
        setSourceText(text);
        if(!text) {
          setError("Could not extract any text from the file.");
        }
    } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to process file.");
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handlePaste = useCallback(async (event: ClipboardEvent) => {
    if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) {
      return;
    }
    
    const items = event.clipboardData?.items;
    if (!items) return;

    let textItem: DataTransferItem | undefined;
    let fileItem: DataTransferItem | undefined;

    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
        fileItem = items[i];
        break;
      }
      if (items[i].kind === 'string' && items[i].type === 'text/plain') {
        textItem = items[i];
      }
    }

    if (fileItem) {
      const file = fileItem.getAsFile();
      if (file) {
          event.preventDefault();
          await processFile(file);
      }
    } else if (textItem) {
      event.preventDefault();
      textItem.getAsString((text) => {
        setSourceText(text);
        setError(null);
        setCards([]);
      });
    }
  }, [processFile]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  const startOver = () => {
    setCards([]);
    setSourceText('');
    setCurrentIndex(0);
    setError(null);
  };

  const handleLoadHistoryItem = (item: HistoryItem) => {
    setSourceText(item.sourceText);
    setCards(item.cards);
    setGenerationType(item.generationType);
    setCurrentIndex(0);
    setError(null);
    setShowHistory(false);
    preloadAudioForCards(item.cards);
  };

  const handleClearHistory = () => {
    clearHistoryUtil();
    setHistory([]);
    setShowHistory(false);
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans flex flex-col">
      <header className="w-full bg-gray-800 bg-opacity-50 backdrop-blur-md p-4 flex justify-between items-center border-b border-gray-700 sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-indigo-400">QuickFlash AI</h1>
        <div className="flex items-center space-x-4">
          <button onClick={() => setShowHistory(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition-colors" title="View my flashcards">
            My Flashcards
          </button>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-8 flex flex-col items-center">
        {isLoading && (
            <div className="flex flex-col items-center justify-center text-center">
                <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
                <h2 className="text-xl font-semibold text-indigo-400">{loadingMessage}</h2>
                <p className="w-full max-w-md text-gray-400 mt-2">
                    AI is thinking... This may take a moment, especially for large texts.
                </p>
            </div>
        )}

        {error && (
            <div className="w-full max-w-2xl bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        )}

        { !isLoading && cards.length > 0 && (
          <div className="w-full max-w-2xl flex flex-col items-center">
             {isPreloadingAudio && (
                <div className="w-full text-center mb-4 text-gray-400 animate-pulse" role="status" aria-live="polite">
                    Preloading audio for cards...
                </div>
            )}
            <CardViewer 
              cards={cards}
              currentIndex={currentIndex}
              setCurrentIndex={setCurrentIndex}
              autoReadBack={autoReadBack}
              isPreloadingAudio={isPreloadingAudio}
            />
            <div className="mt-6 w-full flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <button onClick={startOver} className="text-sm bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-md transition-colors">
                  Generate Next Set
                </button>
                <div className="flex items-center">
                  <input 
                    type="checkbox"
                    id="auto-read-back"
                    checked={autoReadBack}
                    onChange={e => setAutoReadBack(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="auto-read-back" className="ml-2 text-sm text-gray-300">Auto Read Aloud</label>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                  <button onClick={() => exportToText(cards)} className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition-colors flex items-center">
                    <DocumentTextIcon/> Text
                  </button>
                  <button onClick={() => exportToPdf(cards)} className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition-colors flex items-center">
                    <BookOpenIcon/> PDF
                  </button>
              </div>
            </div>
          </div>
        )}

        { !isLoading && cards.length === 0 && (
          <div className="w-full max-w-2xl">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold mb-4 text-white">Enter text to get started</h2>
              <textarea
                value={sourceText}
                onChange={(e) => {
                  setSourceText(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Paste your notes, an article, or any text here... You can also paste an image (Ctrl+V) anywhere on the page."
                className="w-full h-48 p-3 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-y"
              />
              <div className="mt-4 flex items-center justify-center">
                <span className="text-gray-400">OR</span>
              </div>
              <div className="mt-4">
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*, .txt" className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center py-3 px-4 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors border-2 border-dashed border-gray-600 hover:border-gray-500">
                    <UploadIcon />
                    <span className="ml-2 font-semibold">Upload Image or .txt File</span>
                  </button>
              </div>
            </div>

            <div className="mt-6 bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold mb-4 text-white">Generation Type</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button onClick={() => setGenerationType('qa')} className={`p-4 rounded-lg text-left transition-all duration-200 ${generationType === 'qa' ? 'bg-indigo-600 ring-2 ring-indigo-400' : 'bg-gray-700 hover:bg-gray-600'}`}>
                        <p className="font-bold text-white">Q&amp;A Style</p>
                        <p className="text-sm text-gray-300 mt-1">Classic question on the front, answer on the back.</p>
                    </button>
                    <button onClick={() => setGenerationType('concepts')} className={`p-4 rounded-lg text-left transition-all duration-200 ${generationType === 'concepts' ? 'bg-indigo-600 ring-2 ring-indigo-400' : 'bg-gray-700 hover:bg-gray-600'}`}>
                        <p className="font-bold text-white">Concept Style</p>
                        <p className="text-sm text-gray-300 mt-1">Main topic and summary on the front, details on the back.</p>
                    </button>
                </div>
            </div>

            <div className="mt-6 flex justify-center">
                <button 
                  onClick={handleGenerate} 
                  disabled={!sourceText.trim()}
                  className="flex items-center justify-center text-lg font-bold bg-green-600 hover:bg-green-700 text-white py-3 px-8 rounded-lg shadow-md transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:shadow-none"
                >
                    <SparklesIcon />
                    Generate Flashcards
                </button>
            </div>
          </div>
        )}
      </main>

      {showHistory && (
        <History 
            history={history}
            onLoadItem={handleLoadHistoryItem}
            onClearHistory={handleClearHistory}
            onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
};

export default App;