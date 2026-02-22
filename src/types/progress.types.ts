// Progress and user state types

export interface TopicRecord {
  score: number;
  bestScore: number;
  attempts: number;
  completedAt: string;
}

export interface WordRecord {
  correct: number;
  wrong: number;
  lastSeen: string;
}

export interface ProgressData {
  xp: number;
  streak: number;
  completedTopics: Record<string, TopicRecord>;
  wordHistory: Record<string, WordRecord>;
  lastActivity: string;
  lastStudyHour?: number;
  userId: string | null;
}
