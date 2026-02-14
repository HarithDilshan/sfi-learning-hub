export interface VocabWord {
  sv: string;
  en: string;
  pron: string;
}

export interface DialogueLine {
  speaker: string;
  sv: string;
  en: string;
}

export interface GrammarNote {
  title: string;
  rule: string;
  example: string;
}

export interface Exercise {
  type: "mc" | "fill";
  q: string;
  options?: string[];
  answer: number | string;
  hint?: string;
}

export interface Topic {
  id: string;
  icon: string;
  title: string;
  desc: string;
  tags: string[];
  vocab: VocabWord[];
  dialogue?: DialogueLine[];
  grammar?: GrammarNote;
  exercises: Exercise[];
}

export interface CourseLevel {
  name: string;
  desc: string;
  topics: Topic[];
}

export interface PhraseCategory {
  icon: string;
  title: string;
  phrases: { sv: string; en: string }[];
}

export type LevelKey = "A" | "B" | "C" | "D" | "G";
