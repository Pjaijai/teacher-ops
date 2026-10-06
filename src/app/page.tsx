import Link from "next/link";

export default function Home() {
  return (
    <>
      <h1>Teacher Ops</h1>
      <p className="sub">AI tools for HKDSE teachers (F4–F6). Everything runs locally; AI calls go through OpenRouter.</p>
      <div className="cards">
        <Link href="/questions" className="card">
          <h2>Question generator</h2>
          <p>Screenshot or type a reference question → new MC or long questions with figures, checked answers, and a printable worksheet + answer key.</p>
        </Link>
        <Link href="/essay" className="card">
          <h2>作文批改 Essay feedback</h2>
          <p>Photos of a handwritten Chinese essay → exact transcription you can check → 錯別字, 佳句 and 病句 feedback → printable feedback sheet.</p>
        </Link>
      </div>
    </>
  );
}
