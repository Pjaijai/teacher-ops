import { parse, SymbolNode, type MathNode } from "mathjs";
import type { QuestionContent, SymbolicCheck } from "@/lib/schemas/question";
import { runSymbolicCheck } from "@/server/services/practice/check-answer";

/** A symbolic answer (M1/M2) with the code's verdict, for the solution view. */
export type CodeCheck = SymbolicCheck & { ok: boolean; detail: string };

/** Re-run a question's symbolic checks (pure, fast: a few dozen evaluations each). */
export function codeChecksFor(content: Pick<QuestionContent, "symbolicChecks" | "variables">): CodeCheck[] {
  return (content.symbolicChecks ?? []).map((c) => {
    const r = runSymbolicCheck(c, content.variables);
    return { ...c, ok: r.ok, detail: r.detail };
  });
}

function tex(expr: string, rename?: [string, string]) {
  try {
    let node: MathNode = parse(expr);
    if (rename) node = node.transform((n) => ((n as SymbolNode).isSymbolNode && (n as SymbolNode).name === rename[0] ? new SymbolNode(rename[1]) : n));
    return node.toTex({ parenthesis: "auto", implicit: "hide" });
  } catch {
    return `\\text{${expr.replace(/[{}\\]/g, "")}}`;
  }
}

const num = (n: number | null) => (n === null ? "" : String(n));

/** The checked statement as display LaTeX, e.g. \frac{d}{dx}\left[x^2\right] = 2x. */
export function checkToTex(c: SymbolicCheck): string {
  const v = c.variable;
  const f = tex(c.expr);
  const g = tex(c.claimed);
  switch (c.kind) {
    case "derivative":
      return `\\frac{d}{d${v}}\\left[${f}\\right] = ${g}`;
    case "integral":
      return `\\int ${f}\\,d${v} = ${g} + C`;
    case "definite_integral":
      return `\\int_{${num(c.lower)}}^{${num(c.upper)}} ${f}\\,d${v} = ${g}`;
    case "identity":
      return `${f} \\equiv ${g}`;
    case "limit":
      return `\\lim_{${v} \\to ${c.lower === null ? "\\infty" : num(c.lower)}} ${f} = ${g}`;
    case "sum": {
      if (c.upper !== null) return `\\sum_{${v}=${num(c.lower)}}^{${num(c.upper)}} ${f} = ${g}`;
      // Closed form in the last index: show it as n (the claimed expression uses the index letter for it).
      const last = v === "n" ? "m" : "n";
      return `\\sum_{${v}=${num(c.lower)}}^{${last}} ${f} = ${tex(c.claimed, [v, last])}`;
    }
  }
}
