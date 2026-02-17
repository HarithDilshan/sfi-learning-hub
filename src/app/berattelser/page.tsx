"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
// ─── STORY DATA ──────────────────────────────────────────────────────────────
interface StoryWord {
  word: string;
  translation: string;
}

interface StoryParagraph {
  swedish: string;
  english: string;
  highlightWords: StoryWord[]; // key vocab in this paragraph
}

interface ComprehensionQuestion {
  question: string;
  options: string[];
  answer: number;
}

interface Story {
  id: string;
  level: "A" | "B" | "C" | "D";
  title: string;
  titleEn: string;
  emoji: string;
  description: string;
  estimatedTime: string;
  paragraphs: StoryParagraph[];
  questions: ComprehensionQuestion[];
  vocabFocus: string[];
}

const stories: Story[] = [
  {
    id: "ahmed-sfi",
    level: "A",
    title: "Ahmeds första dag på SFI",
    titleEn: "Ahmed's First Day at SFI",
    emoji: "🎒",
    description: "Follow Ahmed on his very first day of Swedish class. Perfect for absolute beginners!",
    estimatedTime: "3 min",
    vocabFocus: ["Greetings", "Numbers", "Family"],
    paragraphs: [
      {
        swedish: "Ahmed kommer från Syrien. Han bor nu i Göteborg. Han är trettiofem år gammal.",
        english: "Ahmed comes from Syria. He now lives in Gothenburg. He is thirty-five years old.",
        highlightWords: [
          { word: "kommer från", translation: "comes from" },
          { word: "bor nu i", translation: "now lives in" },
          { word: "trettiofem år gammal", translation: "thirty-five years old" },
        ],
      },
      {
        swedish: "Idag är det måndag. Klockan är åtta på morgonen. Ahmed går till skolan. Han har en ryggsäck och en penna.",
        english: "Today is Monday. It is eight o'clock in the morning. Ahmed walks to school. He has a backpack and a pen.",
        highlightWords: [
          { word: "Idag", translation: "today" },
          { word: "måndag", translation: "Monday" },
          { word: "Klockan är åtta", translation: "It is eight o'clock" },
          { word: "går till skolan", translation: "walks to school" },
        ],
      },
      {
        swedish: "I klassrummet sitter det tio studenter. Läraren heter Maria. Hon säger: \"Hej allihopa! Välkommen till SFI!\"",
        english: "In the classroom sit ten students. The teacher's name is Maria. She says: \"Hello everyone! Welcome to SFI!\"",
        highlightWords: [
          { word: "tio studenter", translation: "ten students" },
          { word: "Läraren heter", translation: "the teacher's name is" },
          { word: "Välkommen", translation: "welcome" },
        ],
      },
      {
        swedish: "Ahmed presenterar sig: \"Hej! Jag heter Ahmed. Jag kommer från Syrien. Jag har en fru och tre barn.\" Alla ler mot Ahmed.",
        english: "Ahmed introduces himself: \"Hi! My name is Ahmed. I come from Syria. I have a wife and three children.\" Everyone smiles at Ahmed.",
        highlightWords: [
          { word: "presenterar sig", translation: "introduces himself" },
          { word: "Jag heter", translation: "my name is" },
          { word: "Jag har", translation: "I have" },
          { word: "tre barn", translation: "three children" },
        ],
      },
      {
        swedish: "Efter skolan ringer Ahmed sin fru: \"Hej! Jag mår bra. Läraren är snäll. Vi ses snart. Hej då!\"",
        english: "After school, Ahmed calls his wife: \"Hi! I'm doing fine. The teacher is kind. See you soon. Goodbye!\"",
        highlightWords: [
          { word: "ringer", translation: "calls" },
          { word: "Jag mår bra", translation: "I'm doing fine" },
          { word: "snäll", translation: "kind" },
          { word: "Vi ses snart", translation: "see you soon" },
        ],
      },
    ],
    questions: [
      { question: "Where is Ahmed from?", options: ["Iraq", "Syria", "Turkey", "Afghanistan"], answer: 1 },
      { question: "What time does Ahmed go to school?", options: ["Seven o'clock", "Eight o'clock", "Nine o'clock", "Ten o'clock"], answer: 1 },
      { question: "What is the teacher's name?", options: ["Anna", "Sara", "Maria", "Emma"], answer: 2 },
      { question: "How many children does Ahmed have?", options: ["One", "Two", "Three", "Four"], answer: 2 },
    ],
  },
  {
    id: "sara-shopping",
    level: "B",
    title: "Sara handlar mat",
    titleEn: "Sara Goes Grocery Shopping",
    emoji: "🛒",
    description: "Join Sara at the supermarket as she buys food for the week. Learn practical shopping vocabulary.",
    estimatedTime: "4 min",
    vocabFocus: ["Food & Drink", "Numbers", "Polite phrases"],
    paragraphs: [
      {
        swedish: "Det är fredag eftermiddag. Sara ska handla mat till helgen. Hon tar sin shoppinglista och går till ICA-butiken nära hemmet.",
        english: "It's Friday afternoon. Sara is going to buy groceries for the weekend. She takes her shopping list and goes to the ICA store near home.",
        highlightWords: [
          { word: "handla mat", translation: "buy groceries" },
          { word: "helgen", translation: "the weekend" },
          { word: "shoppinglista", translation: "shopping list" },
        ],
      },
      {
        swedish: "På listan står: bröd, mjölk, ägg, ost, kött, grönsaker och frukt. Sara vill också köpa kaffe och glass till barnen.",
        english: "On the list it says: bread, milk, eggs, cheese, meat, vegetables and fruit. Sara also wants to buy coffee and ice cream for the children.",
        highlightWords: [
          { word: "bröd", translation: "bread" },
          { word: "mjölk", translation: "milk" },
          { word: "ägg", translation: "eggs" },
          { word: "grönsaker", translation: "vegetables" },
        ],
      },
      {
        swedish: "I butiken frågar Sara en anställd: \"Ursäkta, var finns riset?\" Mannen svarar: \"Det är i gång tre, till höger om pastan.\"",
        english: "In the store, Sara asks an employee: \"Excuse me, where is the rice?\" The man replies: \"It's in aisle three, to the right of the pasta.\"",
        highlightWords: [
          { word: "Ursäkta", translation: "Excuse me" },
          { word: "var finns", translation: "where is" },
          { word: "till höger om", translation: "to the right of" },
        ],
      },
      {
        swedish: "I kassan säger kassörskan: \"Hej! Har du kundkort?\" Sara svarar: \"Ja, tack!\" Det kostar trehundra kronor. Sara betalar med kort.",
        english: "At the checkout, the cashier says: \"Hi! Do you have a loyalty card?\" Sara answers: \"Yes, thank you!\" It costs three hundred kronor. Sara pays by card.",
        highlightWords: [
          { word: "kassan", translation: "the checkout" },
          { word: "kundkort", translation: "loyalty card" },
          { word: "betalar med kort", translation: "pays by card" },
        ],
      },
      {
        swedish: "Hemma lagar Sara middag: köttbullar med potatis och lingonsylt. Hela familjen äter tillsammans klockan sex. Det smakar jättegott!",
        english: "At home, Sara makes dinner: meatballs with potatoes and lingonberry jam. The whole family eats together at six o'clock. It tastes really good!",
        highlightWords: [
          { word: "lagar middag", translation: "makes dinner" },
          { word: "köttbullar", translation: "meatballs" },
          { word: "äter tillsammans", translation: "eats together" },
          { word: "jättegott", translation: "really delicious" },
        ],
      },
    ],
    questions: [
      { question: "What day is Sara shopping?", options: ["Thursday", "Friday", "Saturday", "Sunday"], answer: 1 },
      { question: "What does Sara want to buy for the children?", options: ["Candy", "Ice cream", "Juice", "Cake"], answer: 1 },
      { question: "How does Sara pay?", options: ["Cash", "With coins", "By card", "With vouchers"], answer: 2 },
      { question: "What time does the family eat dinner?", options: ["Five o'clock", "Six o'clock", "Seven o'clock", "Eight o'clock"], answer: 1 },
    ],
  },
  {
    id: "fatima-doctor",
    level: "C",
    title: "Fatima besöker vårdcentralen",
    titleEn: "Fatima Visits the Health Clinic",
    emoji: "🏥",
    description: "Fatima isn't feeling well and visits the local health clinic. Learn how to navigate the Swedish healthcare system.",
    estimatedTime: "5 min",
    vocabFocus: ["Health", "Appointments", "Describing symptoms"],
    paragraphs: [
      {
        swedish: "Fatima har känt sig sjuk i tre dagar. Hon har feber, hosta och ont i halsen. Hon bestämmer sig för att ringa vårdcentralen och boka en tid.",
        english: "Fatima has been feeling sick for three days. She has a fever, a cough, and a sore throat. She decides to call the health clinic and book an appointment.",
        highlightWords: [
          { word: "känt sig sjuk", translation: "been feeling sick" },
          { word: "ont i halsen", translation: "sore throat" },
          { word: "boka en tid", translation: "book an appointment" },
        ],
      },
      {
        swedish: "I telefon säger Fatima: \"Jag heter Fatima Hassan. Jag behöver träffa en läkare. Jag har haft feber sedan igår.\" Receptionisten svarar: \"Vi kan ta emot dig klockan fjorton idag.\"",
        english: "On the phone, Fatima says: \"My name is Fatima Hassan. I need to see a doctor. I have had a fever since yesterday.\" The receptionist replies: \"We can see you at two o'clock today.\"",
        highlightWords: [
          { word: "träffa en läkare", translation: "see a doctor" },
          { word: "sedan igår", translation: "since yesterday" },
          { word: "ta emot dig", translation: "see/receive you" },
        ],
      },
      {
        swedish: "På vårdcentralen träffar Fatima doktor Svensson. Han frågar: \"Vad har du för besvär?\" Fatima berättar om sina symptom. Läkaren undersöker henne.",
        english: "At the health clinic, Fatima meets Doctor Svensson. He asks: \"What symptoms do you have?\" Fatima describes her symptoms. The doctor examines her.",
        highlightWords: [
          { word: "besvär", translation: "symptoms/troubles" },
          { word: "berättar om", translation: "describes" },
          { word: "undersöker", translation: "examines" },
        ],
      },
      {
        swedish: "\"Du har en inflammation i halsen\", säger doktorn. \"Jag skriver ut ett recept på antibiotika. Du behöver vila och dricka mycket vatten.\" Fatima tackar läkaren.",
        english: "\"You have a throat infection\", says the doctor. \"I will write a prescription for antibiotics. You need to rest and drink a lot of water.\" Fatima thanks the doctor.",
        highlightWords: [
          { word: "inflammation i halsen", translation: "throat infection" },
          { word: "skriver ut ett recept", translation: "write a prescription" },
          { word: "antibiotika", translation: "antibiotics" },
          { word: "vila", translation: "rest" },
        ],
      },
      {
        swedish: "Fatima hämtar medicinen på apoteket. Apotekaren förklarar: \"Ta en tablett tre gånger om dagen i sju dagar. Undvik alkohol under behandlingen.\" Fatima köper medicinen och åker hem.",
        english: "Fatima picks up the medicine at the pharmacy. The pharmacist explains: \"Take one tablet three times a day for seven days. Avoid alcohol during the treatment.\" Fatima buys the medicine and goes home.",
        highlightWords: [
          { word: "hämtar", translation: "picks up" },
          { word: "tre gånger om dagen", translation: "three times a day" },
          { word: "Undvik", translation: "avoid" },
          { word: "behandlingen", translation: "the treatment" },
        ],
      },
    ],
    questions: [
      { question: "How long has Fatima been sick?", options: ["One day", "Two days", "Three days", "A week"], answer: 2 },
      { question: "What time is Fatima's appointment?", options: ["12:00", "13:00", "14:00", "15:00"], answer: 2 },
      { question: "What is Fatima's diagnosis?", options: ["Flu", "Ear infection", "Throat infection", "Pneumonia"], answer: 2 },
      { question: "How many times per day should Fatima take the medicine?", options: ["Once", "Twice", "Three times", "Four times"], answer: 2 },
    ],
  },
  {
    id: "omar-job",
    level: "D",
    title: "Omars jobbintervju",
    titleEn: "Omar's Job Interview",
    emoji: "💼",
    description: "Omar has a job interview at a Swedish company. Learn formal language, workplace vocabulary, and how to present yourself professionally.",
    estimatedTime: "6 min",
    vocabFocus: ["Work", "Formal language", "Expressing opinions"],
    paragraphs: [
      {
        swedish: "Omar kom till Sverige för två år sedan som flykting. Han har en examen i ekonomi från universitetet i Damaskus och har jobbat som revisor i tio år. Nu söker han arbete i Sverige.",
        english: "Omar came to Sweden two years ago as a refugee. He has a degree in economics from the University of Damascus and has worked as an accountant for ten years. Now he is looking for work in Sweden.",
        highlightWords: [
          { word: "examen i ekonomi", translation: "degree in economics" },
          { word: "revisor", translation: "accountant" },
          { word: "söker arbete", translation: "looking for work" },
        ],
      },
      {
        swedish: "Idag har Omar en intervju på Nordea Bank. Han är nervös men väl förberedd. Han har övat på vanliga intervjufrågor och tagit på sig sin bästa kostym.",
        english: "Today Omar has an interview at Nordea Bank. He is nervous but well-prepared. He has practiced common interview questions and put on his best suit.",
        highlightWords: [
          { word: "nervös men väl förberedd", translation: "nervous but well-prepared" },
          { word: "övat på", translation: "practiced" },
          { word: "vanliga intervjufrågor", translation: "common interview questions" },
        ],
      },
      {
        swedish: "Intervjuaren, Kristina, frågar: \"Berätta lite om dig själv och din bakgrund.\" Omar svarar: \"Jag heter Omar och jag har lång erfarenhet inom revision och ekonomistyrning. Jag är noggrann, strukturerad och arbetar bra i team.\"",
        english: "The interviewer, Kristina, asks: \"Tell us a little about yourself and your background.\" Omar answers: \"My name is Omar and I have extensive experience in auditing and financial management. I am meticulous, structured and work well in a team.\"",
        highlightWords: [
          { word: "bakgrund", translation: "background" },
          { word: "revision", translation: "auditing" },
          { word: "noggrann", translation: "meticulous/careful" },
          { word: "strukturerad", translation: "structured" },
        ],
      },
      {
        swedish: "Kristina frågar också: \"Vad är din största utmaning när du arbetar i Sverige jämfört med ditt hemland?\" Omar tänker en stund och svarar: \"Jag tycker att kommunikationskulturen är annorlunda här — man är mer direkt och informell. Det har tagit tid att vänja sig, men jag tycker att det är positivt.\"",
        english: "Kristina also asks: \"What is your biggest challenge when working in Sweden compared to your home country?\" Omar thinks for a moment and replies: \"I think the communication culture is different here — people are more direct and informal. It has taken time to get used to, but I think it is positive.\"",
        highlightWords: [
          { word: "utmaning", translation: "challenge" },
          { word: "jämfört med", translation: "compared to" },
          { word: "direkt och informell", translation: "direct and informal" },
          { word: "vänja sig", translation: "get used to" },
        ],
      },
      {
        swedish: "I slutet av intervjun frågar Kristina om Omar har några frågor. Omar frågar: \"Hur ser möjligheterna för kompetensutveckling ut på företaget?\" Kristina blir imponerad av frågan. Tre dagar senare ringer hon och erbjuder Omar tjänsten.",
        english: "At the end of the interview, Kristina asks if Omar has any questions. Omar asks: \"What are the opportunities for professional development at the company?\" Kristina is impressed by the question. Three days later she calls and offers Omar the position.",
        highlightWords: [
          { word: "kompetensutveckling", translation: "professional development" },
          { word: "imponerad", translation: "impressed" },
          { word: "erbjuder", translation: "offers" },
          { word: "tjänsten", translation: "the position/job" },
        ],
      },
    ],
    questions: [
      { question: "What was Omar's profession in Syria?", options: ["Engineer", "Doctor", "Accountant", "Teacher"], answer: 2 },
      { question: "Where is Omar's interview?", options: ["SEB Bank", "Nordea Bank", "Swedbank", "Handelsbanken"], answer: 1 },
      { question: "What does Omar identify as his biggest challenge in Sweden?", options: ["The language", "The weather", "The communication culture", "The food"], answer: 2 },
      { question: "What question does Omar ask at the end?", options: ["About salary", "About vacation", "About working hours", "About professional development"], answer: 3 },
    ],
  },
];

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export default function MiniStoriesPage() {
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [showTranslation, setShowTranslation] = useState<boolean[]>([]);
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const [tooltipContent, setTooltipContent] = useState<string>("");
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<(number | null)[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string>("all");

  function openStory(story: Story) {
    setSelectedStory(story);
    setShowTranslation(new Array(story.paragraphs.length).fill(false));
    setQuizStarted(false);
    setQuizAnswers(new Array(story.questions.length).fill(null));
    setQuizSubmitted(false);
  }

  function toggleTranslation(idx: number) {
    setShowTranslation(prev => prev.map((v, i) => i === idx ? !v : v));
  }

  function speak(text: string) {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "sv-SE";
    utterance.rate = 0.82;
    speechSynthesis.speak(utterance);
  }

  function handleQuizAnswer(qIdx: number, aIdx: number) {
    if (quizSubmitted) return;
    setQuizAnswers(prev => prev.map((v, i) => i === qIdx ? aIdx : v));
  }

  function submitQuiz() {
    setQuizSubmitted(true);
  }

  const levelColors: Record<string, string> = { A: "#2D8B4E", B: "#005B99", C: "#6B3FA0", D: "#C0392B" };
  const levelBg: Record<string, string> = { A: "#E8F8EE", B: "#E8F4FD", C: "#F0E8FD", D: "#FDEBEA" };

  const filteredStories = selectedLevel === "all"
    ? stories
    : stories.filter(s => s.level === selectedLevel);

  // ── Story List ───────────────────────────────────────────────────────────
  if (!selectedStory) {
    return (
        <>
    <Header />
      <div style={{ background: "var(--warm)", minHeight: "100vh", paddingBottom: "80px" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--text-light)", marginBottom: "24px" }}>
            <Link href="/" style={{ color: "var(--blue)", textDecoration: "none" }}>Hem</Link>
            <span>›</span>
            <span>📖 Berättelser</span>
          </div>

          <div style={{ marginBottom: "28px" }}>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", marginBottom: "8px" }}>
              📖 Mini-berättelser
            </h1>
            <p style={{ color: "var(--text-light)" }}>
              Short stories using vocabulary from each SFI level. Hover over highlighted words to see translations.
            </p>
          </div>

          {/* Level filter */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "28px", flexWrap: "wrap" }}>
            {["all", "A", "B", "C", "D"].map(lvl => (
              <button key={lvl} onClick={() => setSelectedLevel(lvl)} style={{
                padding: "6px 18px", borderRadius: "20px", border: "2px solid",
                borderColor: selectedLevel === lvl ? "var(--blue)" : "var(--warm-dark)",
                background: selectedLevel === lvl ? "var(--blue)" : "white",
                color: selectedLevel === lvl ? "white" : "var(--text)",
                fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
              }}>
                {lvl === "all" ? "Alla nivåer" : `Kurs ${lvl}`}
              </button>
            ))}
          </div>

          {/* Story Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
            {filteredStories.map(story => (
              <div key={story.id}
                onClick={() => openStory(story)}
                style={{
                  background: "white", borderRadius: "14px", padding: "28px",
                  cursor: "pointer", boxShadow: "var(--shadow)",
                  border: "1px solid rgba(0,0,0,0.06)", transition: "all 0.25s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-lg)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow)"; }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>{story.emoji}</div>
                <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                  <span style={{ background: levelBg[story.level], color: levelColors[story.level], padding: "3px 10px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 700 }}>
                    Kurs {story.level}
                  </span>
                  <span style={{ background: "var(--warm)", color: "var(--text-light)", padding: "3px 10px", borderRadius: "10px", fontSize: "0.75rem" }}>
                    ⏱ {story.estimatedTime}
                  </span>
                </div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "4px" }}>{story.title}</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-light)", marginBottom: "12px", lineHeight: 1.5 }}>{story.description}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {story.vocabFocus.map(v => (
                    <span key={v} style={{ background: "var(--warm)", color: "var(--text-light)", padding: "3px 10px", borderRadius: "10px", fontSize: "0.75rem" }}>{v}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
        <Footer />
        </>
    );
  }

  // ── Story Reading View ───────────────────────────────────────────────────
  const story = selectedStory;
  const quizScore = quizSubmitted
    ? story.questions.filter((q, i) => quizAnswers[i] === q.answer).length
    : 0;

  return (
        <>
        <Header />
 
    <div style={{ background: "var(--warm)", minHeight: "100vh", paddingBottom: "80px" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "32px 20px" }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--text-light)", marginBottom: "24px" }}>
          <Link href="/" style={{ color: "var(--blue)", textDecoration: "none" }}>Hem</Link>
          <span>›</span>
          <span style={{ color: "var(--blue)", cursor: "pointer" }} onClick={() => setSelectedStory(null)}>Berättelser</span>
          <span>›</span>
          <span>{story.title}</span>
        </div>

        {/* Story Header */}
        <div style={{ background: "white", borderRadius: "16px", padding: "32px", boxShadow: "var(--shadow-lg)", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "20px" }}>
            <span style={{ fontSize: "3rem" }}>{story.emoji}</span>
            <div>
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <span style={{ background: levelBg[story.level], color: levelColors[story.level], padding: "4px 12px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: 700 }}>
                  Kurs {story.level}
                </span>
                <span style={{ background: "var(--warm)", color: "var(--text-light)", padding: "4px 12px", borderRadius: "12px", fontSize: "0.8rem" }}>
                  ⏱ {story.estimatedTime}
                </span>
              </div>
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.6rem", marginBottom: "4px" }}>{story.title}</h1>
              <p style={{ color: "var(--text-light)", fontSize: "0.9rem" }}>{story.titleEn}</p>
            </div>
          </div>

          <div style={{ background: "var(--yellow-light)", borderRadius: "10px", padding: "12px 16px", fontSize: "0.85rem", marginBottom: "8px" }}>
            💡 <strong>Tip:</strong> Highlighted words show translations on hover. Use the 🔊 button to hear each paragraph read aloud. Click "Show translation" to see the English version.
          </div>
        </div>

        {/* Story Paragraphs */}
        {story.paragraphs.map((para, idx) => (
          <div key={idx} style={{ background: "white", borderRadius: "14px", padding: "28px", boxShadow: "var(--shadow)", marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-light)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Stycke {idx + 1}
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => speak(para.swedish)} style={{
                  background: "var(--blue-light)", border: "none", borderRadius: "6px",
                  padding: "4px 10px", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600, color: "var(--blue)",
                }}>🔊 Lyssna</button>
                <button onClick={() => toggleTranslation(idx)} style={{
                  background: showTranslation[idx] ? "var(--forest-light)" : "var(--warm)",
                  border: "none", borderRadius: "6px",
                  padding: "4px 10px", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600,
                  color: showTranslation[idx] ? "var(--forest)" : "var(--text-light)",
                }}>
                  {showTranslation[idx] ? "🙈 Hide" : "👁 Translate"}
                </button>
              </div>
            </div>

            {/* Swedish text with highlights */}
            <p style={{ fontSize: "1.05rem", lineHeight: 1.8, marginBottom: "12px" }}>
              {(() => {
                let text = para.swedish;
                const parts: React.ReactNode[] = [];
                let lastIdx = 0;
                // Sort by position in text
                const highlights = para.highlightWords
                  .map(hw => ({ ...hw, pos: text.toLowerCase().indexOf(hw.word.toLowerCase()) }))
                  .filter(hw => hw.pos !== -1)
                  .sort((a, b) => a.pos - b.pos);

                for (const hw of highlights) {
                  const pos = text.toLowerCase().indexOf(hw.word.toLowerCase(), lastIdx);
                  if (pos === -1) continue;
                  parts.push(text.slice(lastIdx, pos));
                  parts.push(
                    <span
                      key={pos}
                      title={hw.translation}
                      style={{
                        background: "var(--yellow-light)",
                        borderBottom: "2px solid var(--yellow-dark)",
                        cursor: "help", borderRadius: "2px",
                        padding: "0 2px",
                      }}
                    >
                      {text.slice(pos, pos + hw.word.length)}
                    </span>
                  );
                  lastIdx = pos + hw.word.length;
                }
                parts.push(text.slice(lastIdx));
                return parts;
              })()}
            </p>

            {/* Vocab highlights legend */}
            {para.highlightWords.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                {para.highlightWords.map(hw => (
                  <span key={hw.word} style={{
                    background: "var(--warm)", padding: "3px 10px",
                    borderRadius: "10px", fontSize: "0.78rem",
                  }}>
                    <strong style={{ color: "var(--blue-dark)" }}>{hw.word}</strong>
                    <span style={{ color: "var(--text-light)" }}> = {hw.translation}</span>
                  </span>
                ))}
              </div>
            )}

            {/* English translation */}
            {showTranslation[idx] && (
              <div style={{
                background: "var(--forest-light)", borderRadius: "8px",
                padding: "14px 16px", borderLeft: "3px solid var(--forest)",
                fontSize: "0.92rem", color: "var(--forest)", lineHeight: 1.6,
                fontStyle: "italic",
              }}>
                {para.english}
              </div>
            )}
          </div>
        ))}

        {/* Comprehension Questions */}
        {!quizStarted ? (
          <div style={{
            background: "var(--blue-light)", borderRadius: "14px",
            padding: "28px", textAlign: "center", boxShadow: "var(--shadow)",
          }}>
            <div style={{ fontSize: "2rem", marginBottom: "12px" }}>❓</div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "8px" }}>
              Test Your Understanding
            </h3>
            <p style={{ color: "var(--text-light)", marginBottom: "20px" }}>
              Answer {story.questions.length} questions about what you just read.
            </p>
            <button onClick={() => setQuizStarted(true)} style={{
              padding: "12px 32px", background: "var(--blue)", color: "white",
              border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer",
            }}>
              Starta quiz →
            </button>
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: "14px", padding: "28px", boxShadow: "var(--shadow)" }}>
            <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.3rem", marginBottom: "20px" }}>
              📝 Förståelsefrågor
            </h3>
            {story.questions.map((q, qi) => (
              <div key={qi} style={{ marginBottom: "24px" }}>
                <div style={{ fontWeight: 600, marginBottom: "10px", fontSize: "0.95rem" }}>
                  {qi + 1}. {q.question}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {q.options.map((opt, oi) => {
                    const isSelected = quizAnswers[qi] === oi;
                    const isCorrect = quizSubmitted && oi === q.answer;
                    const isWrong = quizSubmitted && isSelected && oi !== q.answer;
                    return (
                      <button key={oi} onClick={() => handleQuizAnswer(qi, oi)} disabled={quizSubmitted} style={{
                        padding: "10px 14px", borderRadius: "8px",
                        border: `2px solid ${isCorrect ? "var(--correct)" : isWrong ? "var(--wrong)" : isSelected ? "var(--blue)" : "var(--warm-dark)"}`,
                        background: isCorrect ? "var(--correct-bg)" : isWrong ? "var(--wrong-bg)" : isSelected ? "var(--blue-light)" : "var(--warm)",
                        fontFamily: "'Outfit', sans-serif", fontSize: "0.88rem",
                        fontWeight: isSelected || isCorrect ? 700 : 400,
                        cursor: quizSubmitted ? "default" : "pointer",
                        textAlign: "left", transition: "all 0.15s",
                      }}>
                        {isCorrect && "✅ "}{isWrong && "❌ "}{opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {!quizSubmitted ? (
              <button
                onClick={submitQuiz}
                disabled={quizAnswers.some(a => a === null)}
                style={{
                  padding: "12px 28px", background: quizAnswers.some(a => a === null) ? "var(--warm-dark)" : "var(--blue)",
                  color: quizAnswers.some(a => a === null) ? "var(--text-light)" : "white",
                  border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "0.95rem",
                  cursor: quizAnswers.some(a => a === null) ? "default" : "pointer",
                }}
              >
                Lämna in svar
              </button>
            ) : (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{
                  fontSize: "2.5rem", fontWeight: 800,
                  color: quizScore === story.questions.length ? "var(--correct)" : quizScore >= story.questions.length / 2 ? "var(--yellow-dark)" : "var(--wrong)",
                  marginBottom: "8px",
                }}>
                  {quizScore} / {story.questions.length}
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "16px" }}>
                  {quizScore === story.questions.length ? "🎉 Perfekt! Utmärkt läsförståelse!" : quizScore >= story.questions.length / 2 ? "👍 Bra jobbat!" : "Läs berättelsen igen och försök!"}
                </div>
                <button onClick={() => setSelectedStory(null)} style={{
                  padding: "10px 24px", background: "var(--blue)", color: "white",
                  border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem",
                }}>
                  ← Fler berättelser
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    <Footer />
     </>
  );
}