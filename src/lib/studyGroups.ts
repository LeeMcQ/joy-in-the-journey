/* Study Group system — localStorage only, no backend. Supports multiple groups. */

export interface StudyGroup { code: string; name: string; createdAt: string; role: "creator" | "member"; }
export interface GroupActivity { type: "completion" | "streak"; studyNumber?: number; studyTitle?: string; streakDays?: number; timestamp: string; }

const GROUPS_KEY   = "joy-study-groups";  // array of groups
const LEGACY_KEY   = "joy-study-group";   // pre-multi single group
const ACTIVITY_KEY = "joy-group-activity";

export function generateGroupCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/** All groups the user belongs to. Migrates a legacy single group on first read. */
export function getGroups(): StudyGroup[] {
  try {
    const raw = localStorage.getItem(GROUPS_KEY);
    if (raw) return JSON.parse(raw) as StudyGroup[];
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const g = JSON.parse(legacy) as StudyGroup;
      localStorage.setItem(GROUPS_KEY, JSON.stringify([g]));
      localStorage.removeItem(LEGACY_KEY);
      return [g];
    }
    return [];
  } catch { return []; }
}

function saveGroups(list: StudyGroup[]): void {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(list));
}

export function createGroup(name: string): StudyGroup {
  const group: StudyGroup = { code: generateGroupCode(), name, createdAt: new Date().toISOString(), role: "creator" };
  saveGroups([...getGroups(), group]);
  return group;
}

export function joinGroup(code: string, name: string): StudyGroup {
  const norm = code.toUpperCase().trim();
  const existing = getGroups();
  const dup = existing.find((g) => g.code === norm);
  if (dup) return dup; // already a member
  const group: StudyGroup = { code: norm, name: name || `Group ${norm}`, createdAt: new Date().toISOString(), role: "member" };
  saveGroups([...existing, group]);
  return group;
}

export function leaveGroup(code: string): void {
  saveGroups(getGroups().filter((g) => g.code !== code));
}

/** Legacy accessor — first group, or null. */
export function getGroup(): StudyGroup | null {
  return getGroups()[0] ?? null;
}

export function logGroupActivity(activity: Omit<GroupActivity, "timestamp">): void {
  if (getGroups().length === 0) return;
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
