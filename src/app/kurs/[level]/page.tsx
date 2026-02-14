"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getCourse } from "@/lib/content";
import { CourseLevel } from "@/data/types";

export default function KursPage() {
  const params = useParams();
  const level = params.level as string;
  const [data, setData] = useState<CourseLevel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCourse(level).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [level]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="max-w-[1100px] mx-auto px-8 py-20 text-center" style={{ color: "var(--text-light)" }}>
          Loading...
        </div>
        <Footer />
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Header />
        <div className="max-w-[1100px] mx-auto px-8 py-20 text-center">
          <h2 className="text-2xl mb-4">Course not found</h2>
          <Link href="/" style={{ color: "var(--blue)" }}>← Back to home</Link>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="max-w-[1100px] mx-auto px-8 py-10 pb-20 animate-fade-in">
        <div className="flex items-center gap-2 text-sm mb-6" style={{ color: "var(--text-light)" }}>
          <Link href="/" className="no-underline" style={{ color: "var(--blue)" }}>Hem</Link>
          <span>›</span>
          <span>Kurs {level}</span>
        </div>

        <div className="mb-8">
          <h2 className="text-3xl mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>{data.name}</h2>
          <p style={{ color: "var(--text-light)" }}>{data.desc}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.topics.map((topic) => (
            <Link
              key={topic.id}
              href={`/kurs/${level}/${topic.id}`}
              className="bg-white rounded-xl p-7 no-underline transition-all hover:-translate-y-1 hover:shadow-lg relative overflow-hidden border border-black/5"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)", color: "var(--text)" }}
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-[var(--blue)] opacity-0 hover:opacity-100 transition-opacity" />
              <div className="text-3xl mb-3">{topic.icon}</div>
              <h3 className="text-lg font-semibold mb-1.5">{topic.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-light)" }}>{topic.desc}</p>
              <div className="flex gap-3 mt-4">
                {topic.tags.map((t) => (
                  <span key={t} className="text-xs px-2.5 py-1 rounded-full" style={{ background: "var(--warm)", color: "var(--text-light)" }}>
                    {t}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
}