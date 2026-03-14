"use client";

import { Fragment } from "react";

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={idx}>{part}</Fragment>;
  });
}

function getNumberedContent(line: string) {
  const match = line.match(/^\d+\.\s+(.*)$/);
  return match ? match[1] : null;
}

export default function FormattedAiText({ text, className }: { text: string; className?: string }) {
  const lines = text.split(/\r?\n/);

  return (
    <div className={className}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={idx} className="h-3" />;
        }

        const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const value = headingMatch[2];

          if (level === 1) {
            return <h2 key={idx} className="text-lg font-bold text-[#0F2854] mt-1 mb-2">{renderInline(value)}</h2>;
          }
          if (level === 2) {
            return <h3 key={idx} className="text-base font-bold text-[#0F2854] mt-1 mb-2">{renderInline(value)}</h3>;
          }
          return <h4 key={idx} className="text-sm font-semibold text-[#0F2854] mt-1 mb-1.5">{renderInline(value)}</h4>;
        }

        const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
        if (bulletMatch) {
          return (
            <div key={idx} className="flex items-start gap-2.5 py-0.5">
              <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-[#1C4D8D]" />
              <p className="text-sm leading-relaxed text-gray-700">{renderInline(bulletMatch[1])}</p>
            </div>
          );
        }

        const numberedContent = getNumberedContent(trimmed);
        if (numberedContent) {
          const marker = trimmed.match(/^\d+\./)?.[0] || "1.";
          return (
            <div key={idx} className="flex items-start gap-2.5 py-0.5">
              <span className="min-w-6 pt-0.5 text-sm font-semibold text-[#1C4D8D]">{marker}</span>
              <p className="text-sm leading-relaxed text-gray-700">{renderInline(numberedContent)}</p>
            </div>
          );
        }

        const quoteMatch = trimmed.match(/^>\s?(.*)$/);
        if (quoteMatch) {
          return (
            <div key={idx} className="border-l-2 border-[#C8B48A] bg-[#FBF8F2] px-3 py-2 text-sm italic leading-relaxed text-gray-700">
              {renderInline(quoteMatch[1])}
            </div>
          );
        }

        return <p key={idx} className="text-sm leading-relaxed text-gray-700">{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}
