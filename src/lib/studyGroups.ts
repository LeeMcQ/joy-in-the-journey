/* REC 8 — Study Group system — localStorage only, no backend */

export interface StudyGroup { code: string; name: string; createdAt: string; role: "creator" | "member"; }
export interface GroupActivity { type: "completion" | "streak"; studyNumber?: number; studyTitle?: string; streakDays?: number; timestamp: string; }

const GROUP_KEY = "joy-study-group";
const ACTIVITY_KEY = "joy-group-activity";

export function generateGroupCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function createGroup(name: string): StudyGroup {
  const group: StudyGroup = { code: generateGroupCode(), name, createdAt: new Date().toISOString(), role: "creator" };
  localStorage.setItem(GROUP_KEY, JSON.stringify(group));
  return group;
}

export function joinGroup(code: string, name: string): StudyGroup {
  const group: StudyGroup = { code: code.toUpperCase().trim(), name: name || `Group ${code.toUpperCase()}`, createdAt: new Date().toISOString(), role: "member" };
  localStorage.setItem(GROUP_KEY, JSON.stringify(group));
  return group;
}

export function getGroup(): StudyGroup | null {
  try { const r = localStorage.getItem(GROUP_KEY); return r ? JSON.parse(r) as StudyGroup : null; } catch { return null; }
}

export function leaveGroup(): void {
  localStorage.removeItem(GROUP_KEY);
  localStorage.removeItem(ACTIVITY_KEY);
}

export function logGroupActivity(activity: Omit<GroupActivity, "timestamp">): void {
  if (!getGroup()) return;
  const updated = [{ ...activity, timestamp: new Date().toISOString() }, ...getGroupActivity()].slice(0, 50);
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(updated));
}

export function getGroupActivity(): GroupActivity[] {
  try { return JSON.parse(localStorage.getItem(ACTIVITY_KEY) ?? "[]") as GroupActivity[]; } catch { return []; }
}

export function getGroupShareMessage(group: StudyGroup): string {
  return [`✝️ *SDA Bible Study Companion*`, ``, `Join my study group: *${group.name}*`, ``, `Group code: *${group.code}*`, ``, `We're working through all 28 Fundamental`, `Belief studies together. Join us! 📖`, ``, `leemcq.github.io/joy-in-the-journey`].join("\n");
}

export function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}
