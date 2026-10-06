import { askStructured, jsonRoute, type ImageInput } from "@/lib/ai";
import { TRANSCRIBE_SYSTEM, TranscriptionSchema } from "@/lib/essay";

export async function POST(req: Request) {
  return jsonRoute(async () => {
    const { images } = (await req.json()) as { images: ImageInput[] };
    if (!images?.length) throw new Error("Upload at least one page.");

    const transcription = await askStructured({
      name: "transcription",
      system: TRANSCRIBE_SYSTEM,
      images,
      text: `Transcribe this essay (${images.length} page${images.length > 1 ? "s" : ""}, in order) exactly as written.`,
      schema: TranscriptionSchema,
    });
    return { transcription };
  });
}
