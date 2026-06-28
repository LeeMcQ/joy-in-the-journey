/* REC 8 — Study Group Panel */
import { useState } from "react";
import { Users, Copy, Share2, LogOut, Plus, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/Toast";
import { getGroup, createGroup, joinGroup, leaveGroup, getGroupActivity, getGroupShareMessage, relativeTime, type StudyGroup } from "@/lib/studyGroups";
import { shareOrCopy } from "@/lib/sharing";

export function StudyGroupPanel({ variant = "widget" }: { variant?: "widget" | "full" }) {
  const [group, setGroup] = useState<StudyGroup | null>(getGroup);
  const [showFull, setShowFull] = useState(false);

  if (variant === "widget") {
    return (
      <>
        <div className="card card-surface">
          {group ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-500/10"><Users size={18} className="text-gold-500" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-primary">{group.name}</p>
                <p className="text-muted text-[11px] font-mono">Code: {group.code}</p>
              </div>
              <button onClick={() => shareOrCopy(getGroupShareMessage(group), (msg) => showToast(msg))} className="rounded-xl p-2 text-gold-500 active:opacity-70"><Share2 size={16} /></button>
            </div>
          ) : (
            <button onClick={() => setShowFull(true)} className="flex w-full items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-500/10"><Users size={18} className="text-gold-500" /></div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-semibold text-primary">👥 Study with others</p>
                <p className="text-muted text-[12px]">Create or join a group to study together</p>
              </div>
              <span className="text-[12px] font-semibold text-gold-500">Set up →</span>
            </button>
          )}
        </div>
        {showFull && (
          <div className="fixed inset-0 z-[150]">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowFull(false)} />
            <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-navy-700 animate-slide-up pb-8">
              <div className="mx-auto mb-4 mt-3 h-1 w-10 rounded-full bg-white/20" />
              <StudyGroupFull group={group} setGroup={setGroup} onClose={() => setShowFull(false)} />
            </div>
          </div>
        )}
      </>
    );
  }

  return <StudyGroupFull group={group} setGroup={setGroup} onClose={() => {}} />;
}

function StudyGroupFull({ group, setGroup, onClose: _onClose }: { group: StudyGroup | null; setGroup: (g: StudyGroup | null) => void; onClose: () => void; }) {
  const [tab, setTab] = useState<"info" | "create" | "join">(group ? "info" : "create");
  const [groupName, setGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const activity = getGroupActivity();

  const handleCreate = () => {
    if (!groupName.trim()) return;
    const g = createGroup(groupName.trim());
    setGroup(g); setGroupName(""); setTab("info");
    showToast("Study group created!", { type: "success" });
  };

  const handleJoin = () => {
    if (joinCode.trim().length !== 6) { showToast("Enter a 6-character code"); return; }
    const g = joinGroup(joinCode.trim(), joinName.trim());
    setGroup(g); setJoinCode(""); setJoinName(""); setTab("info");
    showToast("Joined group!", { type: "success" });
  };

  const handleLeave = () => {
    if (!confirm("Leave this study group?")) return;
    leaveGroup(); setGroup(null); setTab("create");
  };

  return (
    <div className="flex flex-col gap-4 px-5 pb-2">
      {!group && (
        <div className="flex gap-1 rounded-xl bg-surface p-1">
          {(["create", "join"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn("flex-1 rounded-lg py-2 text-center text-[12px] font-semibold transition-all capitalize", tab === t ? "bg-gold-500 text-navy-900" : "text-muted")}>{t}</button>
          ))}
        </div>
      )}

      {group && (
        <div className="flex flex-col gap-3">
          <div className="text-center">
            <p className="text-lg font-bold text-primary">{group.name}</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="font-mono text-2xl font-bold text-gold-500 tracking-widest">{group.code}</span>
              <button onClick={() => { navigator.clipboard.writeText(group.code); showToast("Code copied!"); }} className="rounded-lg p-1.5 text-muted active:opacity-70"><Copy size={14} /></button>
            </div>
          </div>
          <button onClick={() => shareOrCopy(getGroupShareMessage(group), (msg) => showToast(msg))} className="btn-primary w-full"><Share2 size={16} /> Share with Sabbath School class</button>
          {activity.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Recent Activity</p>
              {activity.slice(0, 8).map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px]">
                  <span>{a.type === "completion" ? "📖" : "🔥"}</span>
                  <span className="flex-1 text-secondary">{a.type === "completion" ? `A member completed ${a.studyTitle ?? "a study"}` : `A member has a ${a.streakDays}-day streak`}</span>
                  <span className="text-muted text-[10px]">{relativeTime(a.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={handleLeave} className="mt-2 flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold text-red-400 active:opacity-70"><LogOut size={14} /> Leave Group</button>
        </div>
      )}

      {!group && tab === "create" && (
        <div className="flex flex-col gap-3">
          <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name (e.g. Maranatha Sabbath School)" className="input" maxLength={50} />
          <button onClick={handleCreate} disabled={!groupName.trim()} className="btn-primary w-full disabled:opacity-30"><Plus size={16} /> Create Group</button>
        </div>
      )}

      {!group && tab === "join" && (
        <div className="flex flex-col gap-3">
          <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))} placeholder="Group code (6 characters)" className="input font-mono text-center text-lg tracking-widest uppercase" maxLength={6} />
          <input type="text" value={joinName} onChange={(e) => setJoinName(e.target.value)} placeholder="Group name (optional)" className="input" maxLength={50} />
          <button onClick={handleJoin} disabled={joinCode.trim().length !== 6} className="btn-primary w-full disabled:opacity-30"><Hash size={16} /> Join Group</button>
        </div>
      )}
    </div>
  );
}
