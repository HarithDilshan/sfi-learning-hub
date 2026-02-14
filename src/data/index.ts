import { PhraseCategory, LevelKey, CourseLevel } from "./types";
import { kursA } from "./kurs-a";
import { kursB } from "./kurs-b";
import { kursC } from "./kurs-c";
import { kursD } from "./kurs-d";

export const courseData: Record<LevelKey, CourseLevel> = {
  A: kursA,
  B: kursB,
  C: kursC,
  D: kursD,
  G: {
    name: "Grammatik",
    desc: "Word order, verbs, nouns, adjectives",
    topics: []
  }
};

export const levelMeta: Record<string, { label: string; desc: string }> = {
  A: { label: "Nybörjare", desc: "Alphabet, greetings, numbers" },
  B: { label: "Grundläggande", desc: "Daily life, food, weather" },
  C: { label: "Mellanliggande", desc: "Work, health, housing" },
  D: { label: "Avancerad", desc: "Society, writing, reading" },
  G: { label: "Grammatik", desc: "Word order, verbs, nouns, adjectives" }
};

export const phrasesData: PhraseCategory[] = [
  {
    icon: "🏪", title: "I affären (At the store)",
    phrases: [
      { sv: "Vad kostar det?", en: "How much does it cost?" },
      { sv: "Kan jag betala med kort?", en: "Can I pay with card?" },
      { sv: "Jag letar efter...", en: "I'm looking for..." },
      { sv: "Har ni...?", en: "Do you have...?" },
      { sv: "Kan jag få kvittot?", en: "Can I get the receipt?" },
      { sv: "Var finns...?", en: "Where is...?" },
    ],
  },
  {
    icon: "🚌", title: "Kollektivtrafik (Public transport)",
    phrases: [
      { sv: "Var ligger busshållplatsen?", en: "Where is the bus stop?" },
      { sv: "Vilken buss går till...?", en: "Which bus goes to...?" },
      { sv: "Jag vill åka till...", en: "I want to go to..." },
      { sv: "Hur lång tid tar det?", en: "How long does it take?" },
      { sv: "Måste jag byta?", en: "Do I need to change?" },
      { sv: "Nästa hållplats, tack.", en: "Next stop, please." },
    ],
  },
  {
    icon: "🏢", title: "På Arbetsförmedlingen (At the employment office)",
    phrases: [
      { sv: "Jag söker arbete.", en: "I'm looking for work." },
      { sv: "Jag är inskriven på Arbetsförmedlingen.", en: "I'm registered at the employment office." },
      { sv: "Jag vill boka ett möte.", en: "I want to book a meeting." },
      { sv: "Vilka jobb finns det?", en: "What jobs are available?" },
      { sv: "Jag behöver hjälp med mitt CV.", en: "I need help with my CV." },
      { sv: "Kan ni hjälpa mig?", en: "Can you help me?" },
    ],
  },
  {
    icon: "🏫", title: "I skolan (At school)",
    phrases: [
      { sv: "Jag förstår inte.", en: "I don't understand." },
      { sv: "Kan du upprepa?", en: "Can you repeat?" },
      { sv: "Vad betyder det?", en: "What does it mean?" },
      { sv: "Hur stavar man...?", en: "How do you spell...?" },
      { sv: "Kan du prata långsammare?", en: "Can you speak more slowly?" },
      { sv: "Jag har en fråga.", en: "I have a question." },
    ],
  },
  {
    icon: "📞", title: "I telefon (On the phone)",
    phrases: [
      { sv: "Hej, jag ringer angående...", en: "Hi, I'm calling regarding..." },
      { sv: "Kan jag prata med...?", en: "Can I speak with...?" },
      { sv: "Kan du stava det?", en: "Can you spell that?" },
      { sv: "Jag ringer tillbaka.", en: "I'll call back." },
      { sv: "Tack för samtalet.", en: "Thank you for the call." },
      { sv: "Hej då!", en: "Goodbye!" },
    ],
  },
  {
    icon: "🏦", title: "På banken (At the bank)",
    phrases: [
      { sv: "Jag vill öppna ett konto.", en: "I want to open an account." },
      { sv: "Jag behöver ett bankkort.", en: "I need a bank card." },
      { sv: "Vad är mitt saldo?", en: "What is my balance?" },
      { sv: "Jag vill överföra pengar.", en: "I want to transfer money." },
      { sv: "Kan jag ta ut pengar?", en: "Can I withdraw money?" },
      { sv: "Jag har tappat mitt kort.", en: "I've lost my card." },
    ],
  },
];
