import type { Flashcard } from '../types';

// Declare global libraries loaded from CDN
declare const jspdf: any;

/**
 * Exports the flashcards to a plain text file.
 * @param flashcards - An array of flashcard objects.
 */
export const exportToText = (flashcards: Flashcard[]): void => {
  let content = 'QuickFlash AI - Flashcards\n\n';
  flashcards.forEach((card, index) => {
    let questionText = card.question;
    if (card.type === 'concepts' && card.question.includes('||')) {
        const [topic, summary] = card.question.split('||');
        questionText = `Concept: ${topic}\n   Summary: ${summary}`;
    } else {
        questionText = `Question: ${card.question}`;
    }
    content += `${index + 1}. ${questionText}\n`;
    content += `   Answer: ${card.answer}\n\n`;
  });

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'flashcards.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Exports the flashcards to a beautifully designed, printer-friendly A4 PDF document.
 * @param flashcards - An array of flashcard objects.
 */
export const exportToPdf = (flashcards: Flashcard[]): void => {
  const { jsPDF } = jspdf;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  // --- Design Constants ---
  const FONT_SIZES = {
    H1: 24,
    H2: 16,
    H3: 14,
    BODY: 11,
    LABEL: 10,
    FOOTER: 9,
  };
  const COLORS = {
    PRIMARY: '#4338CA', // Indigo
    TEXT: '#1F2937',    // Dark Gray
    LABEL: '#6B7280',    // Medium Gray
    BORDER: '#E5E7EB',   // Light Gray Border
    BACKGROUND: '#F9FAFB', // Very Light Gray BG for cards
  };
  const MARGIN = { TOP: 60, BOTTOM: 40, LEFT: 40, RIGHT: 40 };
  const PAGE_WIDTH = doc.internal.pageSize.getWidth();
  const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN.LEFT - MARGIN.RIGHT;
  const CARD_PADDING = 15;
  const CARD_CONTENT_WIDTH = CONTENT_WIDTH - (CARD_PADDING * 2);

  let y = MARGIN.TOP;

  // --- Header ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_SIZES.H1);
  doc.setTextColor(COLORS.PRIMARY);
  doc.text('QuickFlash AI Flashcards', PAGE_WIDTH / 2, 40, { align: 'center' });

  // --- Helper to check for new page ---
  const checkAndAddPage = (neededHeight: number) => {
    if (y + neededHeight > PAGE_HEIGHT - MARGIN.BOTTOM) {
      doc.addPage();
      y = MARGIN.TOP;
    }
  };

  flashcards.forEach((card, index) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.TEXT);

    // --- Calculate card height ---
    let cardHeight = CARD_PADDING * 2 + 25; // Base padding + header space
    if (card.type === 'concepts') {
      const [topic, summary] = card.question.split('||');
      doc.setFontSize(FONT_SIZES.H3);
      cardHeight += doc.getTextDimensions(topic, { maxWidth: CARD_CONTENT_WIDTH }).h;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(FONT_SIZES.BODY);
      cardHeight += doc.getTextDimensions(summary, { maxWidth: CARD_CONTENT_WIDTH }).h + 15; // +space
      doc.setFont('helvetica', 'normal');
      cardHeight += doc.getTextDimensions(card.answer, { maxWidth: CARD_CONTENT_WIDTH }).h + 30; // +space for label
    } else {
      doc.setFontSize(FONT_SIZES.BODY);
      cardHeight += doc.getTextDimensions(card.question, { maxWidth: CARD_CONTENT_WIDTH }).h + 30;
      cardHeight += doc.getTextDimensions(card.answer, { maxWidth: CARD_CONTENT_WIDTH }).h + 30;
    }
    
    checkAndAddPage(cardHeight);
    const startY = y;

    // --- Draw Card Container ---
    doc.setFillColor(COLORS.BACKGROUND);
    doc.setDrawColor(COLORS.BORDER);
    doc.roundedRect(MARGIN.LEFT, startY, CONTENT_WIDTH, cardHeight, 5, 5, 'FD');
    y += CARD_PADDING;

    // --- Draw Card Header ---
    doc.setFontSize(FONT_SIZES.LABEL);
    doc.setTextColor(COLORS.LABEL);
    doc.setFont('helvetica', 'bold');
    doc.text(`CARD ${index + 1} OF ${flashcards.length}`, MARGIN.LEFT + CARD_PADDING, y + 10);
    y += 25;

    // --- Draw Card Content ---
    if (card.type === 'concepts') {
      const [topic, summary] = card.question.split('||');
      
      doc.setFontSize(FONT_SIZES.H3);
      doc.setTextColor(COLORS.PRIMARY);
      doc.setFont('helvetica', 'bold');
      const topicLines = doc.splitTextToSize(topic, CARD_CONTENT_WIDTH);
      doc.text(topicLines, MARGIN.LEFT + CARD_PADDING, y);
      y += topicLines.length * FONT_SIZES.H3 * 1.15;
      
      doc.setFontSize(FONT_SIZES.BODY);
      doc.setTextColor(COLORS.TEXT);
      doc.setFont('helvetica', 'italic');
      const summaryLines = doc.splitTextToSize(summary, CARD_CONTENT_WIDTH);
      doc.text(summaryLines, MARGIN.LEFT + CARD_PADDING, y + 5);
      y += summaryLines.length * FONT_SIZES.BODY * 1.15 + 15;
      
      doc.setDrawColor(COLORS.BORDER);
      doc.line(MARGIN.LEFT + CARD_PADDING, y, PAGE_WIDTH - MARGIN.RIGHT - CARD_PADDING, y);
      y += 15;
      
      doc.setFontSize(FONT_SIZES.LABEL);
      doc.setTextColor(COLORS.LABEL);
      doc.setFont('helvetica', 'bold');
      doc.text('DETAILS', MARGIN.LEFT + CARD_PADDING, y);
      y += 12;

      doc.setFontSize(FONT_SIZES.BODY);
      doc.setTextColor(COLORS.TEXT);
      doc.setFont('helvetica', 'normal');
      doc.text(doc.splitTextToSize(card.answer, CARD_CONTENT_WIDTH), MARGIN.LEFT + CARD_PADDING, y);
    } else { // 'qa' type
      doc.setFontSize(FONT_SIZES.LABEL);
      doc.setTextColor(COLORS.LABEL);
      doc.setFont('helvetica', 'bold');
      doc.text('QUESTION', MARGIN.LEFT + CARD_PADDING, y);
      y += 12;

      doc.setFontSize(FONT_SIZES.BODY);
      doc.setTextColor(COLORS.TEXT);
      doc.setFont('helvetica', 'normal');
      const questionLines = doc.splitTextToSize(card.question, CARD_CONTENT_WIDTH);
      doc.text(questionLines, MARGIN.LEFT + CARD_PADDING, y);
      y += questionLines.length * FONT_SIZES.BODY * 1.15 + 10;
      
      doc.setDrawColor(COLORS.BORDER);
      doc.line(MARGIN.LEFT + CARD_PADDING, y, PAGE_WIDTH - MARGIN.RIGHT - CARD_PADDING, y);
      y += 15;
      
      doc.setFontSize(FONT_SIZES.LABEL);
      doc.setTextColor(COLORS.LABEL);
      doc.setFont('helvetica', 'bold');
      doc.text('ANSWER', MARGIN.LEFT + CARD_PADDING, y);
      y += 12;

      doc.setFontSize(FONT_SIZES.BODY);
      doc.setTextColor(COLORS.TEXT);
      doc.setFont('helvetica', 'normal');
      doc.text(doc.splitTextToSize(card.answer, CARD_CONTENT_WIDTH), MARGIN.LEFT + CARD_PADDING, y);
    }
    
    y = startY + cardHeight + 20; // 20 is space between cards
  });
  
  // --- Add Footers ---
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(FONT_SIZES.FOOTER);
    doc.setTextColor(COLORS.LABEL);
    doc.text(`Page ${i} of ${totalPages}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 20, { align: 'center' });
  }

  doc.save('flashcards.pdf');
};