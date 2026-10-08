/**
 * Writing topics in the shared topic tree: paper parts, then genres (Chinese 乙部) or text types.
 * Question-bank search filters writing tasks by these ids, the same way it filters maths by Learning Unit.
 */
export type WritingTopic = { id: string; parentId: string | null; kind: "part" | "genre" | "text_type"; nameEn: string; nameZh: string };

export const CHI_WRITING_TOPICS: WritingTopic[] = [
  { id: "CHI-B", parentId: null, kind: "part", nameEn: "Part B: essay (乙部 命題寫作)", nameZh: "乙部 命題寫作" },
  { id: "CHI-B-narrative", parentId: "CHI-B", kind: "genre", nameEn: "Narrative", nameZh: "記敘" },
  { id: "CHI-B-argumentative", parentId: "CHI-B", kind: "genre", nameEn: "Argumentative", nameZh: "議論" },
  { id: "CHI-B-lyrical", parentId: "CHI-B", kind: "genre", nameEn: "Lyrical", nameZh: "抒情" },
  { id: "CHI-B-descriptive", parentId: "CHI-B", kind: "genre", nameEn: "Descriptive", nameZh: "描寫" },
  { id: "CHI-B-expository", parentId: "CHI-B", kind: "genre", nameEn: "Expository", nameZh: "說明" },
  { id: "CHI-A", parentId: null, kind: "part", nameEn: "Part A: practical writing (甲部 實用寫作)", nameZh: "甲部 實用寫作" },
  { id: "CHI-A-letter", parentId: "CHI-A", kind: "text_type", nameEn: "Letter", nameZh: "書信" },
  { id: "CHI-A-speech", parentId: "CHI-A", kind: "text_type", nameEn: "Speech", nameZh: "演講辭" },
  { id: "CHI-A-proposal", parentId: "CHI-A", kind: "text_type", nameEn: "Proposal", nameZh: "建議書" },
  { id: "CHI-A-commentary", parentId: "CHI-A", kind: "text_type", nameEn: "Commentary", nameZh: "評論" },
  { id: "CHI-A-report", parentId: "CHI-A", kind: "text_type", nameEn: "Report", nameZh: "報告" },
  { id: "CHI-A-feature", parentId: "CHI-A", kind: "text_type", nameEn: "Feature article", nameZh: "專題文章" },
];

export const ENG_WRITING_TOPICS: WritingTopic[] = [
  { id: "ENG-A", parentId: null, kind: "part", nameEn: "Part A: guided task (~200 words)", nameZh: "甲部 指引寫作" },
  { id: "ENG-B", parentId: null, kind: "part", nameEn: "Part B: extended task (~400 words)", nameZh: "乙部 延伸寫作" },
  ...(
    [
      ["essay", "Essay", "文章"],
      ["article", "Article", "專題文章"],
      ["letter_to_editor", "Letter to the editor", "致編輯信"],
      ["letter", "Letter / email", "書信／電郵"],
      ["blog", "Blog post", "網誌"],
      ["story", "Short story", "短篇故事"],
      ["speech", "Speech", "演講辭"],
      ["proposal", "Proposal", "建議書"],
      ["report", "Report", "報告"],
      ["leaflet", "Leaflet / web page", "單張／網頁"],
    ] as const
  ).map(([id, en, zh]) => ({ id: `ENG-${id}`, parentId: null, kind: "text_type" as const, nameEn: en, nameZh: zh })),
];
