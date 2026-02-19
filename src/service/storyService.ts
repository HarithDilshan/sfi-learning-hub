"use client";

import { supabase } from "@/lib/supabase";

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
  paragraphs: StoryParagraph[];
  questions: StoryQuestion[];
}

// ─── Fetch all stories (list view — no paragraphs/questions) ───
export async function fetchStories(level?: string): Promise<Omit<Story, "paragraphs" | "questions">[]> {
  const query = supabase
    .from("mini_stories")
    .select("*")
    .order("sort_order");

  if (level && level !== "all") query.eq("level", level);

  const { data, error } = await query;
  if (error) {
    console.error("[storyService] fetchStories:", error.message);
    return [];
  }
  return data;
}

// ─── Fetch a single story with paragraphs + questions ───
export async function fetchStory(slug: string): Promise<Story | null> {
  const { data: story, error } = await supabase
    .from("mini_stories")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !story) {
    console.error("[storyService] fetchStory:", error?.message);
    return null;
  }

  const [{ data: paragraphs }, { data: questions }] = await Promise.all([
    supabase
      .from("story_paragraphs")
      .select("*")
      .eq("story_id", story.id)
      .order("sort_order"),
    supabase
      .from("story_questions")
      .select("*")
      .eq("story_id", story.id)
      .order("sort_order"),
  ]);

  return {
    ...story,
    paragraphs: (paragraphs ?? []).map((p) => ({
      ...p,
      highlight_words: Array.isArray(p.highlight_words) ? p.highlight_words : [],
    })),
    questions: questions ?? [],
  };
}

// ─── Fetch all vocab words from all stories (used by DailyChallengePage) ───
export async function fetchAllStoryVocab(): Promise<{ sv: string; en: string; pron: string }[]> {
  const { data, error } = await supabase
    .from("story_paragraphs")
    .select("highlight_words");

  if (error) {
    console.error("[storyService] fetchAllStoryVocab:", error.message);
    return [];
  }

  const vocab: { sv: string; en: string; pron: string }[] = [];
  for (const row of data ?? []) {
    const words: StoryWord[] = Array.isArray(row.highlight_words) ? row.highlight_words : [];
    for (const w of words) {
      vocab.push({ sv: w.word, en: w.translation, pron: "" });
    }
  }
  return vocab;
}

// ─── Fetch sentences for DailyChallengePage (from dialogues table) ───
export interface DailySentence {
  english: string;
  words: string[];
}

export async function fetchDailySentences(): Promise<DailySentence[]> {
  // Pull full dialogue lines — we use the Swedish text split into words as sentence build exercises
  const { data, error } = await supabase
    .from("dialogues")
    .select("swedish, english")
    .order("sort_order");

  if (error) {
    console.error("[storyService] fetchDailySentences:", error.message);
    return [];
  }

  // Filter to lines that are 3–8 words (good for sentence building)
  return (data ?? [])
    .map((row) => ({
      english: row.english,
      words: row.swedish.split(" ").filter((w: string) => w.length > 0),
    }))
    .filter((s) => s.words.length >= 3 && s.words.length <= 8);
}