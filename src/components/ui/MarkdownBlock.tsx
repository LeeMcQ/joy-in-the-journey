import React from "react";

/**
 * Lightweight Markdown renderer shared by every AI surface
 * (scripture popup, study-question answers, and the global chat).
 * Handles bold section headers, horizontal rules, bullet lists,
 * and inline bold/italic. Intentionally dependency-free.
 */
export function MarkdownBlock({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => {
        if (line.startsWith("**") && line.endsWith("**") && line.length > 4)
          return (
            <p key={i} className="text-gold-400 font-bold text-sm mt-4 mb-1 leading-snug">
              {line.slice(2, -2)}
            </p>
          );
        if (line.startsWith("---")) return <hr key={i} className="border-white/10 my-3" />;
        if (line.startsWith("- ") || line.startsWith("• "))
          return (
            <div key={i} className="flex gap-2 text-sm text-white/80 mb-1">
              <span className="text-gold-400 flex-shrink-0 mt-0.5">•</span>
              <span>{inlineFmt(line.slice(2))}</span>
            </div>
          );
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return (
          <p key={i} className="text-sm text-white/85 leading-relaxed mb-0.5">
            {inlineFmt(line)}
          </p>
        );
      })}
    </>
  );
}

export function inlineFmt(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return (
        <strong key={i} className="text-white font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    if (part.startsWith("*") && part.endsWith("*"))
      return (
        <em key={i} className="text-gold-200 italic">
          {part.slice(1, -1)}
        </em>
      );
    return part;
  });
}
