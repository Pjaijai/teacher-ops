import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { cn } from "@/lib/utils";

/** Markdown with LaTeX in $…$ / $$…$$, rendered with KaTeX. Used for every question, solution and scheme. */
export function KatexText({ children, className, inline = false }: { children: string; className?: string; inline?: boolean }) {
  return (
    <div className={cn("katex-text leading-relaxed [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-1.5 [&_table]:my-2 [&_td]:border [&_td]:px-2 [&_th]:border [&_th]:px-2 [&_ul]:list-disc [&_ul]:pl-6", inline && "inline [&_p]:inline", className)}>
      <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
