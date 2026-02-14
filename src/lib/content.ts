import { supabase, isSupabaseConfigured } from "./supabase";
import { courseData as hardcodedCourses, phrasesData as hardcodedPhrases, levelMeta } from "@/data";
import { CourseLevel, Topic, VocabWord, DialogueLine, GrammarNote, Exercise, PhraseCategory, LevelKey } from "@/data/types";

// Try loading from Supabase, fall back to hardcoded data
export async function getCourses(): Promise<Record<string, CourseLevel>> {
  if (!isSupabaseConfigured) return hardcodedCourses;

  try {
    const { data: courses, error } = await supabase
      .from("courses")
      .select("*")
      .order("sort_order");

    if (error || !courses?.length) return hardcodedCourses;

    const result: Record<string, CourseLevel> = {};

    for (const course of courses) {
      const { data: topics } = await supabase
        .from("topics")
        .select("*")
        .eq("course_id", course.id)
        .order("sort_order");

      const fullTopics: Topic[] = [];

      for (const topic of topics || []) {
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

        const dialogue: DialogueLine[] | undefined =
          dialogueRes.data?.length
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

        fullTopics.push({
          id: topic.id,
          icon: topic.icon || "📚",
          title: topic.title,
          desc: topic.description || "",
          tags: topic.tags || [],
          vocab,
          dialogue,
          grammar,
          exercises,
        });
      }

      result[course.id] = {
        name: course.name,
        desc: course.description || "",
        topics: fullTopics,
      };
    }

    return result;
  } catch {
    return hardcodedCourses;
  }
}

export async function getPhrases(): Promise<PhraseCategory[]> {
  if (!isSupabaseConfigured) return hardcodedPhrases;

  try {
    const { data: categories, error } = await supabase
      .from("phrase_categories")
      .select("*")
      .order("sort_order");

    if (error || !categories?.length) return hardcodedPhrases;

    const result: PhraseCategory[] = [];

    for (const cat of categories) {
      const { data: phrases } = await supabase
        .from("phrases")
        .select("*")
        .eq("category_id", cat.id)
        .order("sort_order");

      result.push({
        icon: cat.icon || "💬",
        title: cat.title,
        phrases: (phrases || []).map((p) => ({
          sv: p.swedish,
          en: p.english,
        })),
      });
    }

    return result;
  } catch {
    return hardcodedPhrases;
  }
}

export function getLevelMeta() {
  return levelMeta;
}

// Get a single course
export async function getCourse(level: string): Promise<CourseLevel | null> {
  const courses = await getCourses();
  return courses[level] || null;
}

// Get a single topic
export async function getTopic(level: string, topicId: string): Promise<Topic | null> {
  const course = await getCourse(level);
  if (!course) return null;
  return course.topics.find((t) => t.id === topicId) || null;
}