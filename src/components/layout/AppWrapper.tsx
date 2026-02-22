"use client";

import { useState, useEffect } from "react";
import { LoadingState } from "@/components/ui/LoadingSystem";

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Minimum 800ms so the flag animation is visible, then reveal the app
    const timer = setTimeout(() => setReady(true), 800);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FAF7F2",
      }}>
        <LoadingState type="page" message="Laddar Lär dig Svenska..." />
      </div>
    );
  }

  return <>{children}</>;
}