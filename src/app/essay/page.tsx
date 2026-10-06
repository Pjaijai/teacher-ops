"use client";

import { useEffect, useState } from "react";
import { ImagePicker, postJson, type PickedImage } from "@/components/ImagePicker";
import { countUncertain, segmentText, type FeedbackItem, type Transcription } from "@/lib/essay";

type AnalyzeResponse = { clean: string; items: FeedbackItem[]; overallComment: string };

export default function EssayPage() {
  const [images, setImages] = useState<PickedImage[]>([]);
  const [studentName, setStudentName] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState<string | null>(null);
  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [feedback, setFeedback] = useState<AnalyzeResponse | null>(null);
  const [busy, setBusy] = useState<null | "transcribe" | "analyze">(null);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done, { once: true });
    const t = setTimeout(() => window.print(), 50);
    return () => { clearTimeout(t); window.removeEventListener("afterprint", done); };
  }, [printing]);

  async function transcribe() {
    setBusy("transcribe"); setError(null); setFeedback(null);
    try {
      const { transcription } = await postJson<{ transcription: Transcription }>("/api/essay/transcribe", {
        images: images.map(({ mediaType, data }) => ({ mediaType, data })),
      });
      if (transcription.studentName && !studentName) setStudentName(transcription.studentName);
      if (transcription.title && !title) setTitle(transcription.title);
      setText(transcription.text);
      if (autoAnalyze) await analyze(transcription.text, transcription.title ?? title);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(null); }
  }

  async function analyze(body = text, essayTitle = title) {
    if (!body) return;
    setBusy("analyze"); setError(null);
    try {
      setFeedback(await postJson<AnalyzeResponse>("/api/essay/analyze", { text: body, title: essayTitle }));
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(null); }
  }

  const updateItem = (id: number, patch: Partial<FeedbackItem>) =>
    feedback && setFeedback({ ...feedback, items: feedback.items.map((it) => (it.id === id ? ({ ...it, ...patch } as FeedbackItem) : it)) });
  const removeItem = (id: number) => feedback && setFeedback({ ...feedback, items: feedback.items.filter((it) => it.id !== id) });

  const uncertain = text ? countUncertain(text) : 0;

  return (
    <>
      <div className="no-print">
        <h1>作文批改 Essay feedback</h1>
        <p className="sub">Photos → exact transcription (you check it) → 錯別字 / 佳句 / 病句 → printable feedback sheet.</p>

        <section className="panel">
          <span className="step">Step 1 · Essay pages</span>
          <ImagePicker images={images} onChange={setImages} multiple label="Photos or scans of the essay, in page order" />
          <div className="row" style={{ marginTop: 12 }}>
            <label className="field" style={{ width: 220 }}>Student (name / class no.)
              <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
            </label>
            <label className="field" style={{ flex: 1 }}>Title 題目 (optional)
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="primary" disabled={busy !== null || images.length === 0} onClick={transcribe}>
              {busy === "transcribe" ? "Transcribing…" : "Transcribe"}
            </button>
            <label className="row" style={{ gap: 6 }}>
              <input type="checkbox" checked={autoAnalyze} onChange={(e) => setAutoAnalyze(e.target.checked)} />
              Skip my check — analyse straight away
            </label>
          </div>
        </section>

        {error && <div className="error">{error}</div>}

        {text !== null && !feedback && (
          <section className="panel">
            <span className="step">Step 2 · Check the transcription</span>
            <p className="muted" style={{ marginTop: 0 }}>
              The AI copied the essay <b>exactly as written</b>, mistakes included. <span className="unsure">[X?]</span> = unsure reading
              ({uncertain} found) — check these against the photo and fix them. <span className="malformed">[X!]</span> = malformed character (錯字).
              Don&apos;t correct the student&apos;s real mistakes here.
            </p>
            <div className="split">
              <Photos images={images} />
              <div>
                <MarkedPreview text={text} />
                <textarea className="essay-edit" value={text} onChange={(e) => setText(e.target.value)} />
                <div className="row" style={{ marginTop: 12 }}>
                  <button className="primary" disabled={busy !== null} onClick={() => analyze()}>
                    {busy === "analyze" ? "Analysing…" : "Looks right — analyse"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {feedback && (
          <section className="panel">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="step">Step 3 · Review feedback, then print</span>
              <div className="row">
                <button onClick={() => setFeedback(null)}>← Back to transcription</button>
                <button className="primary" onClick={() => setPrinting(true)}>Print feedback sheet</button>
              </div>
            </div>
            <Legend />
            <div className="split">
              <Photos images={images} />
              <AnnotatedText clean={feedback.clean} items={feedback.items} />
            </div>
            <FeedbackLists items={feedback.items} editable onUpdate={updateItem} onRemove={removeItem} />
            <h3>整體評語 Overall comment</h3>
            <textarea rows={4} value={feedback.overallComment} onChange={(e) => setFeedback({ ...feedback, overallComment: e.target.value })} />
          </section>
        )}
      </div>

      {printing && feedback && (
        <div className="print-only">
          <div className="sheet-head">
            <h1>作文回饋 {title && `·《${title}》`}</h1>
            <div className="sheet-fields">學生：{studentName || <span />}</div>
          </div>
          <Legend />
          <AnnotatedText clean={feedback.clean} items={feedback.items} />
          <FeedbackLists items={feedback.items} />
          <h3>整體評語</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{feedback.overallComment}</p>
        </div>
      )}
    </>
  );
}

function Photos({ images }: { images: PickedImage[] }) {
  return (
    <div className="essay-photos">
      {images.map((img, i) => (
        <div key={i} className="essay-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.preview} alt={`Page ${i + 1}`} />
        </div>
      ))}
    </div>
  );
}

function MarkedPreview({ text }: { text: string }) {
  const parts = text.split(/(\[[^\[\]?!][?!]\])/g);
  return (
    <details open style={{ marginBottom: 8 }}>
      <summary className="muted">Preview with markers highlighted</summary>
      <div className="essay-text" style={{ fontSize: 16, lineHeight: 2 }}>
        {parts.map((p, i) => {
          const m = p.match(/^\[(.)([?!])\]$/);
          if (!m) return <span key={i}>{p}</span>;
          return <span key={i} className={m[2] === "?" ? "unsure" : "malformed"} title={m[2] === "?" ? "Unsure reading" : "Malformed character"}>{m[1]}</span>;
        })}
      </div>
    </details>
  );
}

function Legend() {
  return (
    <div className="legend">
      <span><span className="m-wrong">錯</span><span className="fix">對</span> 錯別字</span>
      <span><span className="m-good">佳句</span></span>
      <span><span className="m-problem">病句</span></span>
    </div>
  );
}

/** Item numbers as shown in the lists: wrong characters first, then good, then problem sentences. */
function numbering(items: FeedbackItem[]) {
  const order = [...items.filter((i) => i.kind === "wrong"), ...items.filter((i) => i.kind === "good"), ...items.filter((i) => i.kind === "problem")];
  return new Map(order.map((it, n) => [it.id, n + 1]));
}

function AnnotatedText({ clean, items }: { clean: string; items: FeedbackItem[] }) {
  const runs = segmentText(clean, items);
  const nums = numbering(items);
  const endingAt = new Map<number, FeedbackItem[]>();
  for (const it of items) if (it.start >= 0) endingAt.set(it.end, [...(endingAt.get(it.end) ?? []), it]);

  return (
    <div className="essay-text">
      {runs.map((run, i) => {
        const kinds = new Set(run.marks.map((m) => m.kind));
        const cls = [...kinds].map((k) => `m-${k}`).join(" ");
        const end = run.startsAt + run.text.length;
        const after = (endingAt.get(end) ?? []).filter((it) => run.marks.some((m) => m.id === it.id));
        return (
          <span key={i}>
            <span className={cls}>{run.text}</span>
            {after.map((it) =>
              it.kind === "wrong"
                ? <span key={it.id} className="fix">{it.correct}</span>
                : <span key={it.id} className="ref">[{nums.get(it.id)}]</span>,
            )}
          </span>
        );
      })}
    </div>
  );
}

function FeedbackLists({ items, editable = false, onUpdate, onRemove }: {
  items: FeedbackItem[];
  editable?: boolean;
  onUpdate?: (id: number, patch: Partial<FeedbackItem>) => void;
  onRemove?: (id: number) => void;
}) {
  const nums = numbering(items);
  const notFound = (it: FeedbackItem) => it.start < 0 && editable && <span className="badge fail">not found in text</span>;
  const field = (label: string, value: string, onChange: (v: string) => void) => (
    <div className="fb-line">
      <span>{label}</span>
      {editable ? <input type="text" value={value} onChange={(e) => onChange(e.target.value)} /> : <span style={{ color: "inherit", fontSize: "inherit" }}>{value}</span>}
    </div>
  );
  const remove = (it: FeedbackItem) => editable && <button className="small" onClick={() => onRemove?.(it.id)}>Remove</button>;

  const wrong = items.filter((i) => i.kind === "wrong");
  const good = items.filter((i) => i.kind === "good");
  const problem = items.filter((i) => i.kind === "problem");

  return (
    <div>
      <h3>錯別字 Wrong characters ({wrong.length})</h3>
      <ul className="fb-list">
        {wrong.map((it) => (
          <li key={it.id} className="k-wrong">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span>{nums.get(it.id)}. <b className="m-wrong">{it.wrong}</b> → <b>{it.correct}</b> {notFound(it)}</span>
              {remove(it)}
            </div>
            {editable && field("正確", it.correct, (v) => onUpdate?.(it.id, { correct: v }))}
            {field("說明", it.explanation, (v) => onUpdate?.(it.id, { explanation: v }))}
          </li>
        ))}
      </ul>
      <h3>佳句 Good sentences ({good.length})</h3>
      <ul className="fb-list">
        {good.map((it) => (
          <li key={it.id} className="k-good">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span>[{nums.get(it.id)}] 「{it.quote}」 {notFound(it)}</span>
              {remove(it)}
            </div>
            {field("好在", it.reason, (v) => onUpdate?.(it.id, { reason: v }))}
          </li>
        ))}
      </ul>
      <h3>病句 Problem sentences ({problem.length})</h3>
      <ul className="fb-list">
        {problem.map((it) => (
          <li key={it.id} className="k-problem">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span>[{nums.get(it.id)}] 「{it.quote}」 {notFound(it)}</span>
              {remove(it)}
            </div>
            {field("問題", it.issue, (v) => onUpdate?.(it.id, { issue: v }))}
            {field("改為", it.rewrite, (v) => onUpdate?.(it.id, { rewrite: v }))}
          </li>
        ))}
      </ul>
    </div>
  );
}
