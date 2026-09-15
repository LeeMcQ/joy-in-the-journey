import React from "react";

/**
 * Lightweight Markdown renderer shared by every AI surface
 * (scripture popup, study-question answers, and the global chat).
 * Handles bold section headers, horizontal rules, bullet lists,
 * and inline bold/italic. Intentionally dependency-free.
 *
 * Uses semantic theme tokens so text stays readable on dark, light, and sepia.
 */
export function MarkdownBlock({ text }: { text: string }) {
  return (
    <div className="text-secondary">
      {text.split("\n").map((line, i) => {
        if (line.startsWith("**") && line.endsWith("**") && line.length > 4)
          return (
            <p key={i} className="text-gold-accessible font-bold text-sm mt-4 mb-1 leading-snug">
              {line.slice(2, -2)}
            </p>
          );
        if (line.startsWith("---")) return <hr key={i} className="border-theme my-3" />;
        if (line.startsWith("- ") || line.startsWith("• "))
          return (
            <div key={i} className="flex gap-2 text-sm text-secondary mb-1">
              <span className="text-gold-accessible flex-shrink-0 mt-0.5">•</span>
              <span>{inlineFmt(line.slice(2))}</span>
            </div>
          );
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return (
          <p key={i} className="text-sm text-secondary leading-relaxed mb-0.5">
            {inlineFmt(line)}
          </p>
        );
      })}
    </div>
  );
}

export function inlineFmt(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return (
        <strong key={i} className="text-primary font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    if (part.startsWith("*") && part.endsWith("*"))
      return (
        <em key={i} className="text-gold-accessible italic">
          {part.slice(1, -1)}
        </em>
      );
    return part;
  });
}