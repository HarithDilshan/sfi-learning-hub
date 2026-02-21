import { supabase } from "./supabase";
import { levelMeta } from "@/data";
import {
  CourseLevel,
  Topic,
  VocabWord,
  DialogueLine,
  GrammarNote,
  Exercise,
  PhraseCategory,
} from "@/data/types";

// ─── LEAN STRUCTURE (profile page, nav, topic lists) ─────────────────────────
// Fetches only course + topic metadata — no vocab/dialogue/grammar/exercises.
// Use this anywhere you just need topic IDs, titles, counts.

export interface TopicMeta {
  id: string;
  icon: string;
  title: string;
  desc: string;
  tags: string[];
}

export interface CourseMeta {
  id: string;
  name: string;
  desc: string;
  topics: TopicMeta[];
}

let _courseMetaCache: Record<string, CourseMeta> | null = null;

export async function getCoursesStructure(): Promise<Record<string, CourseMeta>> {
  // Return cached version if already fetched this session
  if (_courseMetaCache) return _courseMetaCache;

  const { data: courses, error } = await supabase
    .from("courses")
    .select("id, name, description")
    .order("sort_order");

  if (error || !courses?.length) return {};

  const result: Record<string, CourseMeta> = {};

  await Promise.all(
    courses.map(async (course) => {
      const { data: topics } = await supabase
        .from("topics")
        .select("id, icon, title, description, tags")
        .eq("course_id", course.id)
        .order("sort_order");

      result[course.id] = {
        id: course.id,
        name: course.name,
        desc: course.description || "",
        topics: (topics || []).map((t) => ({
          id: t.id,
          icon: t.icon || "📚",
          title: t.title,
          desc: t.description || "",
          tags: t.tags || [],
        })),
      };
    })
  );

  _courseMetaCache = result;
  return result;
}

// ─── FULL COURSE DATA (lesson pages) ─────────────────────────────────────────
// Fetches everything including vocab, dialogue, grammar, exercises.
// Expensive — only call this when opening a specific course or topic.

export async function getCourses(): Promise<Record<string, CourseLevel>> {
  const { data: courses, error } = await supabase
    .from("courses")
    .select("*")
    .order("sort_order");

  if (error || !courses?.length) return {};

  const result: Record<string, CourseLevel> = {};

  for (const course of courses) {
    const { data: topics } = await supabase
      .from("topics")
      .select("*")
      .eq("course_id", course.id)
      .order("sort_order");

    const fullTopics: Topic[] = await Promise.all(
      (topics || []).map(async (topic) => {
        const [vocabRes, dialogueRes, grammarRes, exerciseRes] = await Promise.all([
          supabase.from("vocabulary").select("*").eq("topic_id", topic.id).order("sort_order"),
          supabase.from("dialogues").select("*").eq("topic_id", topic.id).order("sort_order"),
          supabase.from("grammar_notes").select("*").eq("topic_id", topic.id).single(),
          supabase.from("exercises").select("*").eq("topic_id", topic.id).order("sort_order"),
        ]);

        const vocab: VocabWord[] = (vocabRes.data || []).map((v) => ({
          sv: v.swedish,
          en: v.english,
          pron: v.pronunciation || "",
        }));

        const dialogue: DialogueLine[] | undefined = dialogueRes.data?.length
          ? dialogueRes.data.map((d) => ({
              speaker: d.speaker,
              sv: d.swedish,
              en: d.english,
            }))
          : undefined;

        const grammar: GrammarNote | undefined = grammarRes.data
          ? {
              title: grammarRes.data.title,
              rule: grammarRes.data.rule,
              example: grammarRes.data.example,
            }
          : undefined;

        const exercises: Exercise[] = (exerciseRes.data || []).map((e) => ({
          type: e.type as "mc" | "fill",
          q: e.question,
          options: e.options || undefined,
          answer: e.type === "mc" ? parseInt(e.answer) : e.answer,
          hint: e.hint || undefined,
        }));

        return {
          id: topic.id,
          icon: topic.icon || "📚",
          title: topic.title,
          desc: topic.description || "",
          tags: topic.tags || [],
          vocab,
          dialogue,
          grammar,
          exercises,
        };
      })
    );

    result[course.id] = {
      name: course.name,
      desc: course.description || "",
      topics: fullTopics,
    };
  }

  return result;
}

// ─── PHRASES ─────────────────────────────────────────────────────────────────

export async function getPhrases(): Promise<PhraseCategory[]> {
  const { data: categories, error } = await supabase
    .from("phrase_categories")
    .select("*")
    .order("sort_order");

  if (error || !categories?.length) return [];

  const result: PhraseCategory[] = await Promise.all(
    categories.map(async (cat) => {
      const { data: phrases } = await supabase
        .from("phrases")
        .select("*")
        .eq("category_id", cat.id)
        .order("sort_order");

      return {
        icon: cat.icon || "💬",
        title: cat.title,
        phrases: (phrases || []).map((p) => ({
          sv: p.swedish,
          en: p.english,
        })),
      };
    })
  );

  return result;
}

// ─── LEVEL META (local — this is just label config, not content) ─────────────

export function getLevelMeta() {
  return levelMeta;
}

// ─── SINGLE ITEM HELPERS ─────────────────────────────────────────────────────

export async function getCourse(level: string): Promise<CourseLevel | null> {
  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", level)
    .single();

  if (error || !course) return null;

  const { data: topics } = await supabase
    .from("topics")
    .select("*")
    .eq("course_id", level)
    .order("sort_order");

  const fullTopics: Topic[] = await Promise.all(
    (topics || []).map(async (topic) => {
      const [vocabRes, dialogueRes, grammarRes, exerciseRes] = await Promise.all([
        supabase.from("vocabulary").select("*").eq("topic_id", topic.id).order("sort_order"),
        supabase.from("dialogues").select("*").eq("topic_id", topic.id).order("sort_order"),
        supabase.from("grammar_notes").select("*").eq("topic_id", topic.id).single(),
        supabase.from("exercises").select("*").eq("topic_id", topic.id).order("sort_order"),
      ]);

      const vocab: VocabWord[] = (vocabRes.data || []).map((v) => ({
        sv: v.swedish,
        en: v.english,
        pron: v.pronunciation || "",
      }));

      const dialogue: DialogueLine[] | undefined = dialogueRes.data?.length
        ? dialogueRes.data.map((d) => ({
            speaker: d.speaker,
            sv: d.swedish,
            en: d.english,
          }))
        : undefined;

      const grammar: GrammarNote | undefined = grammarRes.data
        ? {
            title: grammarRes.data.title,
            rule: grammarRes.data.rule,
            example: grammarRes.data.example,
          }
        : undefined;

      const exercises: Exercise[] = (exerciseRes.data || []).map((e) => ({
        type: e.type as "mc" | "fill",
        q: e.question,
        options: e.options || undefined,
        answer: e.type === "mc" ? parseInt(e.answer) : e.answer,
        hint: e.hint || undefined,
      }));

      return {
        id: topic.id,
        icon: topic.icon || "📚",
        title: topic.title,
        desc: topic.description || "",
        tags: topic.tags || [],
        vocab,
        dialogue,
        grammar,
        exercises,
      };
    })
  );

  return {
    name: course.name,
    desc: course.description || "",
    topics: fullTopics,
  };
}

export async function getTopic(level: string, topicId: string): Promise<Topic | null> {
  // Fetch only the single topic — much faster than loading the whole course
  const { data: topic, error } = await supabase
    .from("topics")
    .select("*")
    .eq("id", topicId)
    .eq("course_id", level)
    .single();

  if (error || !topic) return null;

  const [vocabRes, dialogueRes, grammarRes, exerciseRes] = await Promise.all([
    supabase.from("vocabulary").select("*").eq("topic_id", topic.id).order("sort_order"),
    supabase.from("dialogues").select("*").eq("topic_id", topic.id).order("sort_order"),
    supabase.from("grammar_notes").select("*").eq("topic_id", topic.id).single(),
    supabase.from("exercises").select("*").eq("topic_id", topic.id).order("sort_order"),
  ]);

  const vocab: VocabWord[] = (vocabRes.data || []).map((v) => ({
    sv: v.swedish,
    en: v.english,
    pron: v.pronunciation || "",
  }));

  const dialogue: DialogueLine[] | undefined = dialogueRes.data?.length
    ? dialogueRes.data.map((d) => ({
        speaker: d.speaker,
        sv: d.swedish,
        en: d.english,
      }))
    : undefined;

  const grammar: GrammarNote | undefined = grammarRes.data
    ? {
        title: grammarRes.data.title,
        rule: grammarRes.data.rule,
        example: grammarRes.data.example,
      }
    : undefined;

  const exercises: Exercise[] = (exerciseRes.data || []).map((e) => ({
    type: e.type as "mc" | "fill",
    q: e.question,
    options: e.options || undefined,
    answer: e.type === "mc" ? parseInt(e.answer) : e.answer,
    hint: e.hint || undefined,
  }));

  return {
    id: topic.id,
    icon: topic.icon || "📚",
    title: topic.title,
    desc: topic.description || "",
    tags: topic.tags || [],
    vocab,
    dialogue,
    grammar,
    exercises,
  };
}