/** Voice input: what the student said to the app, written down exactly. */
export function transcribeSpeechSystem() {
  return `Transcribe what a Hong Kong HKDSE student says to a study app. Output ONLY the transcript — no quotes, labels,
translations or comments. Cantonese → Traditional Chinese characters as spoken (written Cantonese is fine: 嘅 同 唔 啲 咗).
English → English. Code-mixed speech stays mixed, as said. Add normal punctuation. If there is no clear speech (silence,
noise, breathing), output nothing at all.
Expect exam words like 卷一, 甲部, 乙部, 1A, 1B, 多項選擇題, MC, 結構式題目, 課題, 子課題, 難度, 延展部分, 力學, 電學,
熱和氣體, 波動, 光, 聲音, 電磁學, 放射現象, 核能, 牛頓定律, 動量, 透鏡公式.`;
}
