/* REC 8 — WhatsApp-optimised sharing utilities */

export interface ShareableStudyCompletion {
  studyNumber: number; studyTitle: string;
  keyAnswer?: string; keyVerse?: string; streakDays: number;
}
export interface ShareableVerse { reference: string; text: string; translation: string; }
export interface ShareableInsight { question: string; answer: string; studyTitle: string; }

const APP_URL = "leemcq.github.io/joy-in-the-journey";

export function formatStudyCompletionMessage(d: ShareableStudyCompletion): string {
  const lines = [
    `✝️ *SDA Bible Study Companion*`,
    `📖 Ek het voltooi / I just completed:`,
    `*Study ${d.studyNumber}: ${d.studyTitle}*`, ``,
  ];
  if (d.keyAnswer) { lines.push(`My reflection:`); lines.push(`_"${d.keyAnswer.slice(0, 150)}${d.keyAnswer.length > 150 ? "…" : ""}"_`); lines.push(``); }
  if (d.keyVerse) { lines.push(`📖 Key verse: ${d.keyVerse}`); lines.push(``); }
  if (d.streakDays > 1) { lines.push(`🔥 ${d.streakDays} day study streak`); lines.push(``); }
  lines.push(`Join the 28-study journey:`, APP_URL);
  return lines.join("\n");
}

export function formatVerseMessage(d: ShareableVerse): string {
  return [`✝️ *${d.reference}* (${d.translation.toUpperCase()})`, ``, `_"${d.text}"_`, ``, `— SDA Bible Study Companion`, APP_URL].join("\n");
}

export function formatInsightMessage(d: ShareableInsight): string {
  return [`✝️ *SDA Bible Study Companion*`, `📖 Studying: _${d.studyTitle}_`, ``, `*Question:* ${d.question.slice(0, 100)}`, ``, `*My reflection:*`, `_"${d.answer.slice(0, 200)}${d.answer.length > 200 ? "…" : ""}"_`, ``, APP_URL].join("\n");
}

export async function shareToWhatsApp(text: string): Promise<void> {
  if (navigator.share) { await navigator.share({ text }); return; }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

export async function shareOrCopy(text: string, toast: (msg: string) => void): Promise<void> {
  try { await shareToWhatsApp(text); }
  catch { try { await navigator.clipboard.writeText(text); toast("Copied to clipboard — paste into WhatsApp"); } catch { toast("Could not share — please copy manually"); } }
}
