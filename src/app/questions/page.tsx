"use client";

import { useEffect, useState } from "react";
import { DiagramView } from "@/components/DiagramView";
import { ImagePicker, postJson, type PickedImage } from "@/components/ImagePicker";
import { DiagramSchema, checkDiagram } from "@/lib/diagram";
import { LEVELS, type AnswerType, type GeneratedQuestion, type Language, type Level, type Understanding } from "@/lib/questions";

type Result = { question: GeneratedQuestion; problems: string[] };

export default function QuestionsPage() {
  const [images, setImages] = useState<PickedImage[]>([]);
  const [refText, setRefText] = useState("");
  const [understanding, setUnderstanding] = useState<Understanding | null>(null);
  const [diagramJson, setDiagramJson] = useState("");
  const [diagramError, setDiagramError] = useState<string | null>(null);

  const [level, setLevel] = useState<Level>(1);
  const [answerType, setAnswerType] = useState<AnswerType>("long");
  const [language, setLanguage] = useState<Language>("en");
  const [count, setCount] = useState(3);

  const [results, setResults] = useState<Result[]>([]);
  const [title, setTitle] = useState("Pythagoras' Theorem — Practice");
  const [busy, setBusy] = useState<null | "understand" | "generate">(null);
  const [error, setError] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState<null | "worksheet" | "key">(null);

  useEffect(() => {
    if (!printMode) return;
    const done = () => setPrintMode(null);
    window.addEventListener("afterprint", done, { once: true });
    const t = setTimeout(() => window.print(), 50);
    return () => { clearTimeout(t); window.removeEventListener("afterprint", done); };
  }, [printMode]);

  async function understand() {
    setBusy("understand"); setError(null);
    try {
      const { understanding } = await postJson<{ understanding: Understanding }>("/api/questions/understand", {
        text: refText, image: images[0] ? { mediaType: images[0].mediaType, data: images[0].data } : null,
      });
      setUnderstanding(understanding);
      setDiagramJson(understanding.diagram ? JSON.stringify(understanding.diagram, null, 2) : "");
      setDiagramError(null);
      setAnswerType(understanding.answerType);
      setLanguage(understanding.language);
      setResults([]);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(null); }
  }

  function editDiagram(json: string) {
    setDiagramJson(json);
    if (!understanding) return;
    if (!json.trim()) { setUnderstanding({ ...understanding, diagram: null }); setDiagramError(null); return; }
    try {
      const parsed = DiagramSchema.safeParse(JSON.parse(json));
      if (!parsed.success) { setDiagramError("Diagram JSON doesn't match the expected format."); return; }
      setUnderstanding({ ...understanding, diagram: parsed.data });
      setDiagramError(null);
    } catch { setDiagramError("Invalid JSON."); }
  }

  async function generate() {
    if (!understanding) return;
    setBusy("generate"); setError(null);
    try {
      const { results } = await postJson<{ results: Result[] }>("/api/questions/generate", {
        understanding, level, answerType, language, count,
      });
      setResults(results);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(null); }
  }

  const refDiagramProblems = understanding?.diagram ? checkDiagram(understanding.diagram) : [];
  const passed = results.filter((r) => r.problems.length === 0).length;

  return (
    <>
      <div className="no-print">
        <h1>Question generator</h1>
        <p className="sub">Reference question → check what the AI understood → generate variants → print.</p>

        <section className="panel">
          <span className="step">Step 1 · Reference question</span>
          <div className="split">
            <ImagePicker images={images} onChange={setImages} label="Screenshot of the question" />
            <label className="field">
              …and/or type it (describe the figure if there is no screenshot)
              <textarea rows={5} value={refText} onChange={(e) => setRefText(e.target.value)}
                placeholder="e.g. In the figure, ABC is a right-angled triangle with ∠B = 90°, AB = 6 cm, BC = 8 cm. Find AC." />
            </label>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="primary" disabled={busy !== null || (!images.length && !refText.trim())} onClick={understand}>
              {busy === "understand" ? "Reading…" : "Read reference question"}
            </button>
          </div>
        </section>

        {understanding && (
          <section className="panel">
            <span className="step">Step 2 · Here's what I understood — fix anything wrong</span>
            <div className="split">
              <div>
                <label className="field">Question text
                  <textarea rows={6} value={understanding.questionText}
                    onChange={(e) => setUnderstanding({ ...understanding, questionText: e.target.value })} />
                </label>
                <label className="field" style={{ marginTop: 8 }}>Topic
                  <input type="text" value={understanding.topic}
                    onChange={(e) => setUnderstanding({ ...understanding, topic: e.target.value })} />
                </label>
                <label className="field" style={{ marginTop: 8 }}>Key idea / method
                  <textarea rows={3} value={understanding.keyIdea}
                    onChange={(e) => setUnderstanding({ ...understanding, keyIdea: e.target.value })} />
                </label>
              </div>
              <div>
                <h3 style={{ marginTop: 0 }}>Figure</h3>
                {!understanding.diagramSupported && (
                  <div className="warn">This figure type isn&apos;t supported yet (circles, 3D and curves come later). {understanding.diagramNote}</div>
                )}
                {understanding.diagram ? <DiagramView diagram={understanding.diagram} /> : <p className="muted">No figure.</p>}
                {refDiagramProblems.length > 0 && <ul className="problems">{refDiagramProblems.map((p, i) => <li key={i}>{p}</li>)}</ul>}
                <details>
                  <summary className="muted">Edit figure data</summary>
                  <textarea className="mono" rows={12} value={diagramJson} onChange={(e) => editDiagram(e.target.value)} />
                  {diagramError && <div className="error">{diagramError}</div>}
                </details>
              </div>
            </div>
          </section>
        )}

        {understanding && (
          <section className="panel">
            <span className="step">Step 3 · Generate</span>
            <div className="row">
              <label className="field">Variation
                <select value={level} onChange={(e) => setLevel(Number(e.target.value) as Level)}>
                  <option value={1}>1 · Number swap</option>
                  <option value={2}>2 · Context swap</option>
                  <option value={3}>3 · Structure variant</option>
                </select>
              </label>
              <label className="field">Type
                <select value={answerType} onChange={(e) => setAnswerType(e.target.value as AnswerType)}>
                  <option value="long">Long question (written)</option>
                  <option value="mc">Multiple choice</option>
                </select>
              </label>
              <label className="field">Language
                <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
                  <option value="en">English</option>
                  <option value="zh">中文</option>
                </select>
              </label>
              <label className="field">How many
                <input type="number" min={1} max={10} value={count} onChange={(e) => setCount(Number(e.target.value))} style={{ width: 80 }} />
              </label>
              <button className="primary" style={{ alignSelf: "flex-end" }} disabled={busy !== null} onClick={generate}>
                {busy === "generate" ? "Generating & checking…" : "Generate"}
              </button>
            </div>
            <p className="muted" style={{ margin: "8px 0 0" }}>{LEVELS[level]}</p>
          </section>
        )}

        {error && <div className="error">{error}</div>}

        {results.length > 0 && (
          <section className="panel">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="step">Step 4 · Review & print</span>
              <span className={`badge ${passed === results.length ? "pass" : "fail"}`}>
                {passed}/{results.length} passed the answer check
              </span>
            </div>
            <div className="row" style={{ margin: "8px 0 12px" }}>
              <label className="field" style={{ flex: 1 }}>Worksheet title
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <button style={{ alignSelf: "flex-end" }} onClick={() => setPrintMode("worksheet")}>Print worksheet</button>
              <button style={{ alignSelf: "flex-end" }} onClick={() => setPrintMode("key")}>Print answer key</button>
            </div>
            {results.map((r, i) => (
              <QuestionCard key={i} n={i + 1} result={r} answerType={answerType}
                onChange={(q) => setResults(results.map((x, j) => (j === i ? { ...x, question: q } : x)))}
                onDelete={() => setResults(results.filter((_, j) => j !== i))} />
            ))}
          </section>
        )}
      </div>

      {printMode && (
        <div className="print-only">
          <div className="sheet-head">
            <h1>{title}{printMode === "key" ? " — Answer key" : ""}</h1>
            {printMode === "worksheet" && (
              <div className="sheet-fields">Name <span /> Class <span style={{ minWidth: 50 }} /> No. <span style={{ minWidth: 40 }} /></div>
            )}
          </div>
          {results.map((r, i) =>
            printMode === "worksheet"
              ? <PrintQuestion key={i} n={i + 1} q={r.question} answerType={answerType} />
              : <PrintAnswer key={i} n={i + 1} q={r.question} answerType={answerType} />,
          )}
        </div>
      )}
    </>
  );
}

function QuestionCard({ n, result, answerType, onChange, onDelete }: {
  n: number; result: Result; answerType: AnswerType; onChange: (q: GeneratedQuestion) => void; onDelete: () => void;
}) {
  const { question: q, problems } = result;
  const [editing, setEditing] = useState(false);
  return (
    <div className="q">
      <div className="q-head">
        <strong>{n}.</strong>
        <div style={{ flex: 1 }}>
          {editing
            ? <textarea rows={5} value={q.stem} onChange={(e) => onChange({ ...q, stem: e.target.value })} />
            : <div className="q-stem">{q.stem}</div>}
        </div>
        <div className="row" style={{ flex: "none" }}>
          <span className="q-meta">({q.marks} mark{q.marks === 1 ? "" : "s"})</span>
          <span className={`badge ${problems.length ? "fail" : "pass"}`}>{problems.length ? "check failed" : "checked ✓"}</span>
          <button className="small" onClick={() => setEditing(!editing)}>{editing ? "Done" : "Edit"}</button>
          <button className="small" onClick={onDelete}>Delete</button>
        </div>
      </div>
      {q.diagram && <DiagramView diagram={q.diagram} />}
      {answerType === "mc" && (
        <div className="q-options">
          {q.options.map((o) => <div key={o.label} className={o.label === q.correctOption ? "correct" : ""}>{o.label}. {o.text}</div>)}
        </div>
      )}
      {problems.length > 0 && <ul className="problems">{problems.map((p, i) => <li key={i}>{p}</li>)}</ul>}
      <details className="q-solution">
        <summary>
          Answer: {q.answers.map((a) => (a.part ? `(${a.part}) ` : "") + a.display).join("; ")}
          {answerType === "mc" && q.correctOption ? ` — ${q.correctOption}` : ""}
        </summary>
        <ol>{q.solution.map((s, i) => <li key={i}>{s}</li>)}</ol>
        {q.distractorNotes.length > 0 && (
          <div className="q-meta">Distractors: {q.distractorNotes.map((d) => `${d.label} — ${d.mistake}`).join("; ")}</div>
        )}
        <div className="q-meta">Check: {q.answers.map((a) => `${a.expression} = ${a.value}`).join("; ")} with {q.variables.map((v) => `${v.name}=${v.value}`).join(", ")}</div>
      </details>
    </div>
  );
}

function PrintQuestion({ n, q, answerType }: { n: number; q: GeneratedQuestion; answerType: AnswerType }) {
  return (
    <div className="q">
      <div className="q-head">
        <strong>{n}.</strong>
        <div className="q-stem" style={{ flex: 1 }}>{q.stem}</div>
        <span>({q.marks} mark{q.marks === 1 ? "" : "s"})</span>
      </div>
      {q.diagram && <DiagramView diagram={q.diagram} />}
      {answerType === "mc" ? (
        <div className="q-options">{q.options.map((o) => <div key={o.label}>{o.label}. {o.text}</div>)}</div>
      ) : (
        <div className="answer-lines">{Array.from({ length: Math.max(4, q.marks * 2) }, (_, i) => <div key={i} />)}</div>
      )}
    </div>
  );
}

function PrintAnswer({ n, q, answerType }: { n: number; q: GeneratedQuestion; answerType: AnswerType }) {
  return (
    <div className="q">
      <strong>{n}. {answerType === "mc" ? `${q.correctOption} — ` : ""}{q.answers.map((a) => (a.part ? `(${a.part}) ` : "") + a.display).join("; ")}</strong>
      <ol style={{ margin: "4px 0" }}>{q.solution.map((s, i) => <li key={i}>{s}</li>)}</ol>
      {q.distractorNotes.length > 0 && (
        <div style={{ fontSize: "10pt" }}>Distractors: {q.distractorNotes.map((d) => `${d.label} — ${d.mistake}`).join("; ")}</div>
      )}
    </div>
  );
}
