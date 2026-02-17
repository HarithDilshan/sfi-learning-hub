"use client";

import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useState } from "react";

interface Props {
  /** Set to true when rendered inside the mobile drawer (slightly different styling) */
  mobile?: boolean;
}

export default function NotificationBell({ mobile = false }: Props) {
  const { status, subscribed, enable, disable } = useNotifications();
  const [tooltip, setTooltip] = useState(false);

  // Don't render if browser can't support it
  if (status === "unsupported") return null;

  const isLoading = status === "loading";
  const isDenied = status === "denied";

  function handleClick() {
    if (isLoading) return;
    if (subscribed) {
      disable();
    } else {
      enable();
    }
  }

  const label = subscribed
    ? "Stäng av påminnelser"
    : isDenied
    ? "Aviseringar blockerade i webbläsaren"
    : "Slå på dagliga påminnelser";

  if (mobile) {
    return (
      <button
        onClick={isDenied ? undefined : handleClick}
        disabled={isDenied || isLoading}
        title={label}
        className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
          isDenied
            ? "opacity-40 cursor-not-allowed"
            : subscribed
            ? "bg-white/15 text-white"
            : "text-white/60 hover:bg-white/10 hover:text-white"
        }`}
      >
        {isLoading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : subscribed ? (
          <BellRing size={14} />
        ) : isDenied ? (
          <BellOff size={14} />
        ) : (
          <Bell size={14} />
        )}
        {subscribed ? "🔔 Påminnelser på" : isDenied ? "Blockerade" : "Påminnelser av"}
      </button>
    );
  }

  return (
    <div className="relative" onMouseLeave={() => setTooltip(false)}>
      <button
        onClick={isDenied ? undefined : handleClick}
        onMouseEnter={() => setTooltip(true)}
        disabled={isDenied || isLoading}
        aria-label={label}
        className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
          isDenied
            ? "opacity-40 cursor-not-allowed bg-white/5"
            : subscribed
            ? "bg-yellow-400/20 text-yellow-300 hover:bg-yellow-400/30"
            : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
        }`}
      >
        {isLoading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : subscribed ? (
          <BellRing size={14} />
        ) : isDenied ? (
          <BellOff size={14} />
        ) : (
          <Bell size={14} />
        )}
      </button>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute right-0 top-full mt-2 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap z-50 pointer-events-none"
          style={{
            background: "var(--blue-dark)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.15)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}