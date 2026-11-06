import { Fragment, type ReactNode } from "react";

/**
 * Small, safe Markdown renderer for AI replies: headings, bullet and numbered
 * lists, bold, italic, inline code and links. Builds React elements (no HTML
 * injection).
 */
export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r/g, "").split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    const heading = line.match(/^\s{0,3}(#{1,4})\s+(.*)$/);
    if (heading) {
      blocks.push(
        <p key={i} className="mt-2 font-semibold text-foreground first:mt-0">
          {inline(heading[2])}
        </p>
      );
      i++;
      continue;
    }

    const listMatch = (l: string) => l.match(/^(\s*)([-*•]|\d+[.)])\s+(.*)$/);
    if (listMatch(line)) {
      const ordered = /\d/.test(listMatch(line)![2]);
      const items: { indent: number; content: string }[] = [];
      while (i < lines.length && listMatch(lines[i])) {
        const m = listMatch(lines[i])!;
        items.push({ indent: Math.min(Math.floor(m[1].length / 2), 3), content: m[3] });
        i++;
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List key={i} className={`my-1 space-y-0.5 pl-4 ${ordered ? "list-decimal" : "list-disc"} marker:text-baby-blue`}>
          {items.map((item, j) => (
            <li key={j} style={{ marginLeft: item.indent * 12 }}>
              {inline(item.content)}
            </li>
          ))}
        </List>
      );
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !listMatch(lines[i]) && !/^\s{0,3}#{1,4}\s/.test(lines[i])) {
      paragraph.push(lines[i].trim());
      i++;
    }
    blocks.push(
      <p key={i} className="my-1 first:mt-0 last:mb-0">
        {inline(paragraph.join(" "))}
      </p>
    );
  }

  return <div className={`leading-relaxed ${className}`}>{blocks}</div>;
}

const TOKEN = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\s][^*]*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;

function inline(text: string): ReactNode {
  return text.split(TOKEN).map((part, i) => {
    if (!part) return null;
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="rounded bg-background/70 px-1 py-0.5 font-mono text-[0.92em]">{part.slice(1, -1)}</code>;
    }
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (link) {
      return (
        <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" className="text-baby-blue underline underline-offset-2">
          {link[1]}
        </a>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
