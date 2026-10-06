import { askStructured, jsonRoute } from "@/lib/ai";
import { ANALYZE_SYSTEM, AnalysisSchema, locateFeedback, stripMarkers } from "@/lib/essay";

export async function POST(req: Request) {
  return jsonRoute(async () => {
    const { text, title } = (await req.json()) as { text: string; title?: string | null };
    if (!text?.trim()) throw new Error("The transcription is empty.");

    const { clean, malformed } = stripMarkers(text);
    const analysis = await askStructured({
      name: "essay_feedback",
      system: ANALYZE_SYSTEM,
      text: `${title ? `題目：${title}\n\n` : ""}學生作文：\n${clean}`,
      schema: AnalysisSchema,
    });
    return { clean, items: locateFeedback(clean, analysis, malformed), overallComment: analysis.overallComment };
  });
}
