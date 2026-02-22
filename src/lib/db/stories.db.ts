"use client";

import { supabase } from "./client";
import type { Story, StoryWord, DailySentence } from "@/types/story.types";

export async function fetchStories(level?: string): Promise<Omit<Story, "paragraphs" | "questions">[]> {
  const query = supabase.from("mini_stories").select("*").order("sort_order");
  if (level && level !== "all") query.eq("level", level);
  const { data, error } = await query;
  if (error) { console.error("[stories.db] fetchStories:", error.message); return []; }
  return data;
}

export async function fetchStory(slug: string): Promise<Story | null> {
  const { data: story, error } = await supabase.from("mini_stories").select("*").eq("slug", slug).single();
  if (error || !story) return null;
  const [{ data: paragraphs }, { data: questions }] = await Promise.all([
    supabase.from("story_paragraphs").select("*").eq("story_id", story.id).order("sort_order"),
    supabase.from("story_questions").select("*").eq("story_id", story.id).order("sort_order"),
  ]);
  return {
    ...story,
    paragraphs: (paragraphs ?? []).map((p) => ({ ...p, highlight_words: Array.isArray(p.highlight_words) ? p.highlight_words : [] })),
    questions: questions ?? [],
  };
}

export async function fetchAllStoryVocab(): Promise<{ sv: string; en: string; pron: string }[]> {
  const { data, error } = await supabase.from("story_paragraphs").select("highlight_words");
  if (error) return [];
  const vocab: { sv: string; en: string; pron: string }[] = [];
  for (const row of data ?? []) {
    const words: StoryWord[] = Array.isArray(row.highlight_words) ? row.highlight_words : [];
    for (const w of words) vocab.push({ sv: w.word, en: w.translation, pron: "" });
  }
  return vocab;
}

export async function fetchDailySentences(): Promise<DailySentence[]> {
  const { data, error } = await supabase.from("dialogues").select("swedish, english").order("sort_order");
  if (error) return [];
  return (data ?? [])
    .map((row) => ({ english: row.english, words: row.swedish.split(" ").filter((w: string) => w.length > 0) }))
    .filter((s) => s.words.length >= 3 && s.words.length <= 8);
}
