import { askStructured, jsonRoute, type ImageInput } from "@/lib/ai";
import { UNDERSTAND_SYSTEM, UnderstandingSchema } from "@/lib/questions";

export async function POST(req: Request) {
  return jsonRoute(async () => {
    const { text, image } = (await req.json()) as { text?: string; image?: ImageInput | null };
    if (!text?.trim() && !image) throw new Error("Provide a screenshot or type the reference question.");

    const understanding = await askStructured({
      name: "understanding",
      system: UNDERSTAND_SYSTEM,
      images: image ? [image] : [],
      text: [
        image ? "The reference question is in the image." : "",
        text?.trim() ? `Teacher's typed text / figure description:\n${text.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      schema: UnderstandingSchema,
    });
    return { understanding };
  });
}
