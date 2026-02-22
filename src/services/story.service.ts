"use client";
// All story-related DB operations
// Previously: src/service/storyService.ts

export type { Story, StoryParagraph, StoryQuestion, StoryWord, DailySentence } from "@/types/story.types";
export { fetchStories, fetchStory, fetchAllStoryVocab, fetchDailySentences } from "@/lib/db/stories.db";

// Save an AI-generated story to the database
import { supabase } from "@/lib/db/client";
import type { Story, StoryParagraph } from "@/types/story.types";

export async function saveAiStory(story: Omit<Story, "id">): Promise<string | null> {
  const { data, error } = await supabase
    .from("mini_stories")
    .insert({
      slug: story.slug,
      level: story.level,
      title: story.title,
      title_en: story.title_en,
      emoji: story.emoji,
      description: story.description,
      estimated_time: story.estimated_time,
      vocab_focus: story.vocab_focus,
      sort_order: 9999,
      is_ai_generated: true,
    })
    .select("id")
    .single();

  if (error || !data) { console.error("[story.service] saveAiStory:", error?.message); return null; }

  const storyId = data.id;

  await Promise.all([
    supabase.from("story_paragraphs").insert(
      story.paragraphs.map((p, i) => ({
        story_id: storyId, sort_order: i + 1,
        swedish: p.swedish, english: p.english, highlight_words: p.highlight_words,
      }))
    ),
    supabase.from("story_questions").insert(
      story.questions.map((q, i) => ({
        story_id: storyId, sort_order: i + 1,
        question: q.question, options: q.options, answer: q.answer,
      }))
    ),
  ]);

  return storyId;
}
