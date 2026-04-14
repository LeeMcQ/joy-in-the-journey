import { Quote, Lightbulb, BookOpen, Star, Megaphone } from "lucide-react";
import { useReadingStyle } from "@/hooks/useReadingStyle";
import { HighlightableText } from "@/components/study/HighlightableText";
import type { ContentSection } from "@/data/types";

const iconMap: Record<string, typeof Quote> = {
  quote: Quote, illustration: Lightbulb, readDirective: BookOpen, principle: Star, custom: Megaphone,
};

interface Props {
  section: ContentSection;
  studyId: number;
  sectionIndex: number;
  index?: number;
}

export function SectionBlock({ section, studyId, sectionIndex, index = 0 }: Props) {
  const readingStyle = useReadingStyle();
  const delay = `${Math.min(index, 10) * 50}ms`;

  if (section.type === "conclusion") {
    return (
      <div className="animate-slide-up" style={{ animationDelay: delay }}>
        <div className="relative overflow-hidden rounded-2xl border border-gold-500/20 bg-gold-500/[0.04] p-5">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gold-500/[0.08] blur-2xl" />
          <p className="relative mb-3 text-2xs font-bold uppercase tracking-caps text-gold-500">✦ Conclusion</p>
          <HighlightableText text={section.text} studyId={studyId} context={{ type: "section", sectionIndex }} className="relative text-secondary" style={readingStyle} />
        </div>
      </div>
    );
  }

  if (section.type === "introduction") {
    return (
      <div className="note-block animate-slide-up" style={{ animationDelay: delay }}>
        <HighlightableText text={section.text} studyId={studyId} context={{ type: "section", sectionIndex }} className="text-secondary" style={readingStyle} />
      </div>
    );
  }

  if (section.type === "quote") {
    return (
      <div className="animate-slide-up" style={{ animationDelay: delay }}>
        <div className="card card-gold relative overflow-hidden">
          <Quote size={40} className="pointer-events-none absolute -left-1 -top-1 text-gold-500/[0.08]" />
          <HighlightableText text={section.text} studyId={studyId} context={{ type: "section", sectionIndex }} className="relative italic text-secondary" style={readingStyle} />
          {section.attribution && <p className="text-muted relative mt-3 text-[12px]">— {section.attribution}</p>}
        </div>
      </div>
    );
  }

  const Icon = iconMap[section.type] ?? Lightbulb;

  return (
    <div className="animate-slide-up" style={{ animationDelay: delay }}>
      <div className="card card-surface">
        {(section.title || section.type !== "custom") && (
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gold-500/10">
              <Icon size={13} className="text-gold-500" />
            </div>
            <p className="text-2xs font-bold uppercase tracking-caps text-gold-500">{section.title || section.type}</p>
          </div>
        )}
        <HighlightableText text={section.text} studyId={studyId} context={{ type: "section", sectionIndex }} className="text-secondary" style={readingStyle} />
        {section.attribution && <p className="text-muted mt-3 text-[12px] italic">— {section.attribution}</p>}
        {section.items && section.items.length > 0 && (
          <ol className="mt-4 space-y-2.5 pl-0.5" style={readingStyle}>
            {section.items.map((item, i) => (
              <li key={i} className="flex gap-3 text-secondary">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-500/10 text-[10px] font-bold text-gold-500">{i + 1}</span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
