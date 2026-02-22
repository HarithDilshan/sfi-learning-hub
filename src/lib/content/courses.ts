import { supabase } from "@/lib/db/client";
import { levelMeta } from "@/data";
import type { CourseLevel, Topic, VocabWord, DialogueLine, GrammarNote, Exercise, PhraseCategory } from "@/types/course.types";

export { levelMeta };

export function getLevelMeta() {
  return levelMeta;
}

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

// ─── Lean structure — profile page, nav, topic lists ─────────────────────────
export async function getCoursesStructure(): Promise<Record<string, CourseMeta>> {
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

// ─── Full course data — lesson pages only ────────────────────────────────────
export async function getCourses(): Promise<Record<string, CourseLevel>> {
  const { data: courses, error } = await supabase.from("courses").select("*").order("sort_order");
  if (error || !courses?.length) return {};

  const result: Record<string, CourseLevel> = {};

  for (const course of courses) {
    const { data: topics } = await supabase.from("topics").select("*").eq("course_id", course.id).order("sort_order");

    const fullTopics: Topic[] = await Promise.all(
      (topics || []).map(async (topic) => {
        const [vocabRes, dialogueRes, grammarRes, exerciseRes] = await Promise.all([
          supabase.from("vocabulary").select("*").eq("topic_id", topic.id).order("sort_order"),
          supabase.from("dialogues").select("*").eq("topic_id", topic.id).order("sort_order"),
          supabase.from("grammar_notes").select("*").eq("topic_id", topic.id).single(),
          supabase.from("exercises").select("*").eq("topic_id", topic.id).order("sort_order"),
        ]);

        const vocab: VocabWord[] = (vocabRes.data || []).map((v) => ({
          sv: v.swedish, en: v.english, pron: v.pronunciation || "",
        }));

        const dialogue: DialogueLine[] = (dialogueRes.data || []).map((d) => ({
          speaker: d.speaker, sv: d.swedish, en: d.english,
        }));

        const grammarData = grammarRes.data;
        const grammar: GrammarNote | undefined = grammarData
          ? { title: grammarData.title, rule: grammarData.rule, example: grammarData.example }
          : undefined;

        const exercises: Exercise[] = (exerciseRes.data || []).map((e) => ({
          type: e.type as "mc" | "fill",
          q: e.question,
          options: e.options || [],
          answer: e.answer,
          hint: e.hint,
        }));

        return {
          id: topic.id,
          icon: topic.icon || "📚",
          title: topic.title,
          desc: topic.description || "",
          tags: topic.tags || [],
          vocab, dialogue, grammar, exercises,
        };
      })
    );

    result[course.id] = { name: course.name, desc: course.description || "", topics: fullTopics };
  }

  return result;
}

export async function getCourse(level: string): Promise<CourseLevel | null> {
  const { data: course, error } = await supabase.from("courses").select("*").eq("id", level.toUpperCase()).single();
  if (error || !course) return null;

  const { data: topics } = await supabase.from("topics").select("*").eq("course_id", course.id).order("sort_order");

  const fullTopics: Topic[] = await Promise.all(
    (topics || []).map(async (topic) => {
      const [vocabRes, dialogueRes, grammarRes, exerciseRes] = await Promise.all([
        supabase.from("vocabulary").select("*").eq("topic_id", topic.id).order("sort_order"),
        supabase.from("dialogues").select("*").eq("topic_id", topic.id).order("sort_order"),
        supabase.from("grammar_notes").select("*").eq("topic_id", topic.id).single(),
        supabase.from("exercises").select("*").eq("topic_id", topic.id).order("sort_order"),
      ]);

      return {
        id: topic.id,
        icon: topic.icon || "📚",
        title: topic.title,
        desc: topic.description || "",
        tags: topic.tags || [],
        vocab: (vocabRes.data || []).map((v) => ({ sv: v.swedish, en: v.english, pron: v.pronunciation || "" })),
        dialogue: (dialogueRes.data || []).map((d) => ({ speaker: d.speaker, sv: d.swedish, en: d.english })),
        grammar: grammarRes.data ? { title: grammarRes.data.title, rule: grammarRes.data.rule, example: grammarRes.data.example } : undefined,
        exercises: (exerciseRes.data || []).map((e) => ({ type: e.type as "mc" | "fill", q: e.question, options: e.options || [], answer: e.answer, hint: e.hint })),
      };
    })
  );

  return { name: course.name, desc: course.description || "", topics: fullTopics };
}

export async function getTopic(level: string, topicId: string): Promise<Topic | null> {
  const { data: topic, error } = await supabase.from("topics").select("*").eq("id", topicId).eq("course_id", level.toUpperCase()).single();
  if (error || !topic) return null;

  const [vocabRes, dialogueRes, grammarRes, exerciseRes] = await Promise.all([
    supabase.from("vocabulary").select("*").eq("topic_id", topic.id).order("sort_order"),
    supabase.from("dialogues").select("*").eq("topic_id", topic.id).order("sort_order"),
    supabase.from("grammar_notes").select("*").eq("topic_id", topic.id).single(),
    supabase.from("exercises").select("*").eq("topic_id", topic.id).order("sort_order"),
  ]);

  return {
    id: topic.id,
    icon: topic.icon || "📚",
    title: topic.title,
    desc: topic.description || "",
    tags: topic.tags || [],
    vocab: (vocabRes.data || []).map((v) => ({ sv: v.swedish, en: v.english, pron: v.pronunciation || "" })),
    dialogue: (dialogueRes.data || []).map((d) => ({ speaker: d.speaker, sv: d.swedish, en: d.english })),
    grammar: grammarRes.data ? { title: grammarRes.data.title, rule: grammarRes.data.rule, example: grammarRes.data.example } : undefined,
    exercises: (exerciseRes.data || []).map((e) => ({ type: e.type as "mc" | "fill", q: e.question, options: e.options || [], answer: e.answer, hint: e.hint })),
  };
}

export async function getPhrases(): Promise<PhraseCategory[]> {
  const { data, error } = await supabase.from("phrases").select("*").order("sort_order");
  if (error || !data) return [];
  return data.map((cat) => ({
    icon: cat.icon || "💬",
    title: cat.title,
    phrases: (cat.phrases || []) as { sv: string; en: string }[],
  }));
}
