export const QUESTION_BANK_SCHEMA_VERSION = "core-exam-question-bank-v1";

export type WorkshopQuestion = {
  archived: boolean;
  prompt: string;
  rank: number;
  stableKey: string;
  topicStableKey: string;
};

export type QuestionBankDocument = {
  questions: WorkshopQuestion[];
  savedAt: string;
  schemaVersion: typeof QUESTION_BANK_SCHEMA_VERSION;
};

export type QuestionBankSyncResult = {
  activeCount: number;
  archivedCount: number;
  collaborationReset: boolean;
};

export type WorkshopAction = "finalize" | "preview" | "save";

export type WorkshopApiResponse =
  | {
      document: QuestionBankDocument;
      message: string;
      ok: true;
      result?: QuestionBankSyncResult;
    }
  | {
      error: string;
      ok: false;
    };
