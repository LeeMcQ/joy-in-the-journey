/* Study Group Panel — supports multiple groups (create + join) */
import { useState } from "react";
import { Users, Copy, Share2, LogOut, Plus, Hash, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/Toast";
import {
  getGroups, createGroup, joinGroup, leaveGroup,
  getGroupActivity, getGroupShareMessage, relativeTime, type StudyGroup,
} from "@/lib/studyGroups";
import { shareOrCopy } from "@/lib/sharing";

export function StudyGroupPanel({ variant = "widget" }: { variant?: "widget" | "full" }) {
  const [groups, setGroups] = useState<StudyGroup[]>(getGroups);
  const [showFull, setShowFull] = useState(false);

  if (variant === "widget") {
    return (
      <>
        <div className="card card-surface">
          <button onClick={() => setShowFull(true)} className="flex w-full items-center gap-3 text-left">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-500/10"><Users size={18} className="text-gold-500" /></div>
            <div className="min-w-0 flex-1">
              {groups.length ? (
                <>
                  <p className="text-sm font-semibold text-primary">{groups.length === 1 ? groups[0].name : `${groups.length} study groups`}</p>
                  <p className="text-muted text-[12px]">Tap to manage or add another</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-primary">👥 Study with others</p>
                  <p className="text-muted text-[12px]">Create or join a group to study together</p>
                </>
              )}
            </div>
            <span className="text-[12px] font-semibold text-gold-500">{groups.length ? "Manage →" : "Set up →"}</span>
          </button>
        </div>
        {showFull && (
          <div className="fixed inset-0 z-[150]">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowFull(false)} />
            <div className="absolute bottom-0 left-0 right-0 mx-auto w-full md:max-w-2xl max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-navy-700 animate-slide-up pb-8">
              <div className="mx-auto mb-4 mt-3 h-1 w-10 rounded-full bg-white/20" />
              <GroupManager groups={groups} setGroups={setGroups} />
            </div>
          </div>
        )}
      </>
    );
  }

  return <GroupManager groups={groups} setGroups={setGroups} />;
}

function GroupManager({ groups, setGroups }: { groups: StudyGroup[]; setGroups: (g: StudyGroup[]) => void; }) {
  const [adding, setAdding] = useState(groups.length === 0);
  const [tab, setTab] = useState<"create" | "join">("create");
  const [groupName, setGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [openCode, setOpenCode] = useState<string | null>(null);
  const activity = getGroupActivity();

  const handleCreate = () => {
    if (!groupName.trim()) return;
    createGroup(groupName.trim());
    setGroups(getGroups()); setGroupName(""); setAdding(false);
    showToast("Study group created!", { type: "success" });
  };

  const handleJoin = () => {
    if (joinCode.trim().length !== 6) { showToast("Enter a 6-character code"); return; }
    joinGroup(joinCode.trim(), joinName.trim());
    setGroups(getGroups()); setJoinCode(""); setJoinName(""); setAdding(false);
    showToast("Joined group!", { type: "success" });
  };

  const handleLeave = (code: string) => {
    if (!confirm("Leave this study group?")) return;
    leaveGroup(code);
    setGroups(getGroups());
  };

  return (
    <div className="flex flex-col gap-3 px-1">
      {/* Existing groups */}
      {groups.map((group) => {
        const open = openCode === group.code;
        return (
          <div key={group.code} className="rounded-xl bg-surface p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-500/10"><Users size={16} className="text-gold-500" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-primary truncate">{group.name}</p>
                <p className="text-muted text-[11px] font-mono">Code: {group.code}</p>
              </div>
              <button onClick={() => shareOrCopy(getGroupShareMessage(group), (msg) => showToast(msg))} className="rounded-lg p-2 text-gold-500 active:opacity-70" aria-label="Share group"><Share2 size={16} /></button>
              <button onClick={() => setOpenCode(open ? null : group.code)} className="rounded-lg p-2 text-muted active:opacity-70" aria-label="Group details">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
            </div>

            {open && (
              <div className="mt-3 flex flex-col gap-3 border-t border-white/8 pt-3">
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-2xl font-bold tracking-widest text-gold-500">{group.code}</span>
                  <button onClick={() => { navigator.clipboard.writeText(group.code); showToast("Code copied!"); }} className="rounded-lg p-1.5 text-muted active:opacity-70" aria-label="Copy code"><Copy size={14} /></button>
                </div>
                <button onClick={() => shareOrCopy(getGroupShareMessage(group), (msg) => showToast(msg))} className="btn-primary w-full"><Share2 size={16} /> Share with Sabbath School class</button>
                <button onClick={() => handleLeave(group.code)} className="flex items-center justify-center gap-2 rounded-xl py-2 text-[13px] font-semibold text-red-400 active:opacity-70"><LogOut size={14} /> Leave group</button>
              </div>
            )}
          </div>
        );
      })}

      {/* Recent activity (shared across groups) */}
      {groups.length > 0 && activity.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl bg-surface p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Recent Activity</p>
          {activity.slice(0, 6).map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-[12px]">
              <span>{a.type === "completion" ? "📖" : "🔥"}</span>
              <span className="flex-1 text-secondary">{a.type === "completion" ? `A member completed ${a.studyTitle ?? "a study"}` : `A member has a ${a.streakDays}-day streak`}</span>
              <span className="text-muted text-[10px]">{relativeTime(a.timestamp)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add another group */}
      {!adding ? (
        <button onClick={() => setAdding(true)} className="flex items-center justify-center gap-2 rounded-xl border border-gold-500/25 py-2.5 text-[13px] font-semibold text-gold-500 active:opacity-70">
          <Plus size={15} /> {groups.length ? "Create or join another group" : "Create or join a group"}
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl bg-surface p-3">
          <div className="flex gap-1 rounded-xl bg-navy-800/60 p-1">
            {(["create", "join"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={cn("flex-1 rounded-lg py-2 text-center text-[12px] font-semibold capitalize transition-all", tab === t ? "bg-gold-500 text-navy-900" : "text-muted")}>{t}</button>
            ))}
          </div>

          {tab === "create" ? (
            <div className="flex flex-col gap-3">
              <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name (e.g. Maranatha Sabbath School)" className="input" maxLength={50} />
              <button onClick={handleCreate} disabled={!groupName.trim()} className="btn-primary w-full disabled:opacity-30"><Plus size={16} /> Create Group</button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))} placeholder="Group code (6 characters)" className="input font-mono text-center text-lg uppercase tracking-widest" maxLength={6} />
              <input type="text" value={joinName} onChange={(e) => setJoinName(e.target.value)} placeholder="Group name (optional)" className="input" maxLength={50} />
              <button onClick={handleJoin} disabled={joinCode.trim().length !== 6} className="btn-primary w-full disabled:opacity-30"><Hash size={16} /> Join Group</button>
            </div>
          )}

          {groups.length > 0 && (
            <button onClick={() => setAdding(false)} className="text-[12px] font-semibold text-muted active:opacity-70">Cancel</button>
          )}
        </div>
      )}
    </div>
  );
}
