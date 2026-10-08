/**
 * Importing this module registers every job handler with the runner.
 * Each feature keeps its long-running work next to its services.
 */
import "@/server/services/writing/writing-jobs";
import "@/server/services/practice/practice-jobs";
import "@/server/services/questions/question-jobs";
