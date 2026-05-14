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

function isTableRow(line: string): boolean {
  return line.startsWith("|") && line.endsWith("|");
}

function isTableSeparator(line: string): boolean {
  return /^\|[\s\-:|]+\|$/.test(line);
}

function parseTable(lines: string[], startIdx: number): { table: React.ReactNode; endIdx: number } | null {
  const tableLines: string[] = [];
  let i = startIdx;

  while (i < lines.length && isTableRow(lines[i].trim())) {
    tableLines.push(lines[i].trim());
    i++;
  }

  if (tableLines.length < 3) return null;
  if (!isTableSeparator(tableLines[1])) return null;

  const headerRow = tableLines[0];
  const dataRows = tableLines.slice(2);

  const parseRow = (row: string): string[] =>
    row.split("|").slice(1, -1).map(cell => cell.trim());

  const headers = parseRow(headerRow);

  const table = (
    <div key={`table-${startIdx}`} className="overflow-x-auto my-3 rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-[#F5F1EA] border-b border-gray-200">
            {headers.map((h, hi) => (
              <th key={hi} className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-[#1C2333] border-r border-gray-200 last:border-r-0">
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, ri) => {
            const cells = parseRow(row);
            return (
              <tr key={ri} className="border-b border-gray-100 last:border-b-0 hover:bg-slate-50">
                {cells.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2.5 text-gray-700 border-r border-gray-100 last:border-r-0 leading-relaxed">
                    {renderInline(cell)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return { table, endIdx: i };
}

export default function FormattedAiText({ text, className }: { text: string; className?: string }) {
  const lines = text.split(/\r?\n/);

  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      elements.push(<div key={`e-${i}`} className="h-3" />);
      i++;
      continue;
    }

    const tableResult = parseTable(lines, i);
    if (tableResult) {
      elements.push(tableResult.table);
      i = tableResult.endIdx;
      continue;
    }

    const isHr = /^[-*_]{3,}$/.test(trimmed);
    if (isHr) {
      elements.push(<hr key={`e-${i}`} className="my-3 border-gray-200" />);
      i++;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const value = headingMatch[2];
      if (level === 1) {
        elements.push(<h2 key={`e-${i}`} className="text-lg font-bold text-[#0F2854] mt-1 mb-2">{renderInline(value)}</h2>);
      } else if (level === 2) {
        elements.push(<h3 key={`e-${i}`} className="text-base font-bold text-[#0F2854] mt-1 mb-2">{renderInline(value)}</h3>);
      } else {
        elements.push(<h4 key={`e-${i}`} className="text-sm font-semibold text-[#0F2854] mt-1 mb-1.5">{renderInline(value)}</h4>);
      }
      i++;
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      elements.push(
        <div key={`e-${i}`} className="flex items-start gap-2.5 py-0.5">
          <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-[#1C4D8D]" />
          <p className="text-sm leading-relaxed text-gray-700">{renderInline(bulletMatch[1])}</p>
        </div>
      );
      i++;
      continue;
    }

    const numberedContent = getNumberedContent(trimmed);
    if (numberedContent) {
      const marker = trimmed.match(/^\d+\./)?.[0] || "1.";
      elements.push(
        <div key={`e-${i}`} className="flex items-start gap-2.5 py-0.5">
          <span className="min-w-6 pt-0.5 text-sm font-semibold text-[#1C4D8D]">{marker}</span>
          <p className="text-sm leading-relaxed text-gray-700">{renderInline(numberedContent)}</p>
        </div>
      );
      i++;
      continue;
    }

    const quoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      elements.push(
        <div key={`e-${i}`} className="border-l-2 border-[#C8B48A] bg-[#FBF8F2] px-3 py-2 text-sm italic leading-relaxed text-gray-700">
          {renderInline(quoteMatch[1])}
        </div>
      );
      i++;
      continue;
    }

    elements.push(<p key={`e-${i}`} className="text-sm leading-relaxed text-gray-700">{renderInline(trimmed)}</p>);
    i++;
  }

  return <div className={className}>{elements}</div>;
}
