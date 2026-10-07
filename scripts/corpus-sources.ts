/**
 * Where each HKEAA exemplar sits in the PDFs under paper/ (1-indexed, inclusive page ranges).
 * Exemplar 4 of every level is the held-out test set (split "test"); the rest are anchors.
 * Page maps were found from the PDFs' heading pages and checked visually.
 */
export type ExemplarSource = { year: number; level: number; n: number; pages: [number, number] };

type YearSource = { file: string; exemplars: Record<number, [number, number][]> };

export const CHI_WRITING: Record<number, YearSource> = {
  2025: {
    file: "paper/chinese-writing/2025/2025-Sample-CHI-Paper2-K249.pdf",
    exemplars: {
      5: [[3, 8], [9, 15], [16, 22], [23, 28]],
      4: [[29, 33], [34, 39], [40, 45], [46, 51]],
      3: [[52, 56], [57, 61], [62, 67], [68, 75]],
      2: [[76, 79], [80, 84], [85, 88], [89, 93]],
      1: [[94, 98], [99, 102], [103, 106], [107, 110]],
    },
  },
  2024: {
    file: "paper/chinese-writing/2024/2024-Sample-CHI-Paper2-618P.pdf",
    exemplars: {
      5: [[3, 8], [9, 16], [17, 23], [24, 31]],
      4: [[32, 37], [38, 42], [43, 48], [49, 55]],
      3: [[56, 60], [61, 65], [66, 71], [72, 76]],
      2: [[77, 80], [81, 86], [87, 91], [92, 96]],
      1: [[97, 100], [101, 106], [107, 111], [112, 116]],
    },
  },
};

export function exemplars(sources: Record<number, YearSource>) {
  return Object.entries(sources).flatMap(([year, src]) =>
    Object.entries(src.exemplars).flatMap(([level, ranges]) =>
      ranges.map((pages, i) => ({ file: src.file, year: Number(year), level: Number(level), n: i + 1, pages })),
    ),
  );
}
