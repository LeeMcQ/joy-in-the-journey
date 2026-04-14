import type { Study } from "@/data/types";

/** Tailwind-safe class merge (simple version) */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Count questions in a study */
export function countQuestions(study: Study): number {
  return study.elements.filter((e) => e.kind === "question").length;
}

/** Format study number with leading zero */
export function studyLabel(num: number): string {
  return `Study ${String(num).padStart(2, "0")}`;
}

/** Truncate text to a max length */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}
