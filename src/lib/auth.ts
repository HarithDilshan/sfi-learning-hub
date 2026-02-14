"use client";

import { supabase, isSupabaseConfigured } from "./supabase";

export async function signUp(email: string, password: string) {
  if (!isSupabaseConfigured) return { error: { message: "Supabase not configured" } };
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { data, error };
}

export async function signIn(email: string, password: string) {
  if (!isSupabaseConfigured) return { error: { message: "Supabase not configured" } };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signOut() {
  if (!isSupabaseConfigured) return;
  await supabase.auth.signOut();
}

export async function getUser() {
  if (!isSupabaseConfigured) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export function onAuthChange(callback: (user: unknown) => void) {
  if (!isSupabaseConfigured) return { unsubscribe: () => {} };
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
  return subscription;
}

export async function signInWithGoogle() {
  if (!isSupabaseConfigured) return { error: { message: "Supabase not configured" } };
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: typeof window !== "undefined" ? window.location.origin : "",
    },
  });
  return { data, error };
}