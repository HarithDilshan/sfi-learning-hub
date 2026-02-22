// Story types (previously scattered in storyService.ts and berattelser/page.tsx)

export interface StoryWord {
  word: string;
  translation: string;
}

export interface StoryParagraph {
  id: string;
  sort_order: number;
  swedish: string;
  english: string;
  highlight_words: StoryWord[];
}

export interface StoryQuestion {
  id: string;
  sort_order: number;
  question: string;
  options: string[];
  answer: number;
}

export interface Story {
  id: string;
  slug: string;
  level: "A" | "B" | "C" | "D";
  title: string;
  title_en: string;
  emoji: string;
  description: string;
  estimated_time: string;
  vocab_focus: string[];
  sort_order: number;
  is_ai_generated?: boolean;
  paragraphs: StoryParagraph[];
  questions: StoryQuestion[];
}

export interface DailySentence {
  english: string;
  words: string[];
}
