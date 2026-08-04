import { NextResponse } from "next/server";
import { createCoreExamServerClient } from "../../lib/supabase/server";
import { getCoreExamAccess } from "../../lib/viewer";
import {
  markQuestionBankFinalized,
  saveQuestionBankDraft,
  snapshotQuestionBank,
} from "../store";
import type {
  QuestionBankSyncResult,
  WorkshopAction,
  WorkshopApiResponse,
} from "../types";

function unavailable() {
  return NextResponse.json<WorkshopApiResponse>(
    { error: "Question Workshop is available only in development.", ok: false },
    { status: 404 },
  );
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return unavailable();

  const access = await getCoreExamAccess();
  if (access.status !== "member" || access.viewer.role !== "owner") {
    return NextResponse.json<WorkshopApiResponse>(
      { error: "Core Exam owner access is required.", ok: false },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as {
      action?: WorkshopAction;
      document?: unknown;
    };
    if (
      body.action !== "save" &&
      body.action !== "preview" &&
      body.action !== "finalize"
    ) {
      return NextResponse.json<WorkshopApiResponse>(
        { error: "Unknown workshop action.", ok: false },
        { status: 400 },
      );
    }

    const document = await saveQuestionBankDraft(body.document);
    if (body.action === "save") {
      return NextResponse.json<WorkshopApiResponse>({
        document,
        message: "Draft saved privately.",
        ok: true,
      });
    }

    if (body.action === "finalize") {
      await snapshotQuestionBank("pre-finalize", document);
    }

    const supabase = await createCoreExamServerClient();
    const { data, error } = await supabase.rpc(
      "core_exam_sync_curated_question_bank",
      {
        question_bank: document.questions,
        reset_collaboration: body.action === "finalize",
      },
    );
    if (error) throw error;

    const result = data as QuestionBankSyncResult;
    if (body.action === "finalize") {
      const finalized = await markQuestionBankFinalized(document);
      return NextResponse.json<WorkshopApiResponse>({
        document: finalized,
        message: "Question bank finalized. A private snapshot was saved.",
        ok: true,
        result,
      });
    }

    return NextResponse.json<WorkshopApiResponse>({
      document,
      message: "Preview applied to the local site.",
      ok: true,
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown workshop error.";
    return NextResponse.json<WorkshopApiResponse>(
      { error: message, ok: false },
      { status: 400 },
    );
  }
}
