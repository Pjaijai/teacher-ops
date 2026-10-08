/** Daily free credits per student, reset at 00:00 HKT. Shared by the API and the UI (cost labels). */
export const DAILY_QUOTA = 100;

export const CREDIT_COSTS = {
  bank_question: 0,
  mc_mark: 0,
  task_analysis: 1,
  helper: 2,
  new_question: 2,
  reference_understand: 2,
  reference_generate: 2,
  transcribe_page: 3,
  mark_answer: 5,
  writing_feedback: 8,
  dse_estimate: 5,
  level_sample: 10,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;
