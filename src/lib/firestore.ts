import {
  collection,
  addDoc,
  doc,
  getDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import type { ResumeAnalysisResult } from "@workspace/api-client-react";

/* ─── Stored document shape ─────────────────────────────────── */
export interface SavedAnalysis {
  id: string;
  userId: string;
  createdAt: Date;
  targetRole: string;
  resumeSnippet: string;
  overallScore: number;
  atsScore: number | null;
  result: ResumeAnalysisResult;
}

/* Raw Firestore document (before hydration) */
interface RawAnalysisDoc {
  userId: string;
  createdAt: Timestamp | null;
  targetRole: string;
  resumeSnippet: string;
  overallScore: number;
  atsScore: number | null;
  result: ResumeAnalysisResult;
}

/* ─── Save a completed analysis ─────────────────────────────── */
export async function saveResumeAnalysis(
  userId: string,
  result: ResumeAnalysisResult,
  targetRole: string,
  resumeText: string,
): Promise<string> {
  if (!isFirebaseConfigured || !db) {
    throw new Error("Firestore is not configured.");
  }

  const col = collection(db, "users", userId, "resumeAnalyses");
  const doc = await addDoc(col, {
    userId,
    createdAt: serverTimestamp(),
    targetRole: targetRole.trim() || "General",
    resumeSnippet: resumeText.trim().slice(0, 200),
    overallScore: result.overallScore,
    atsScore: result.atsScore ?? null,
    result,
  });

  return doc.id;
}

/* ─── Fetch a single analysis by ID ────────────────────────── */
export async function fetchSingleAnalysis(
  userId: string,
  id: string,
): Promise<SavedAnalysis | null> {
  if (!isFirebaseConfigured || !db) return null;

  const ref = doc(db, "users", userId, "resumeAnalyses", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = snap.data() as RawAnalysisDoc;
  return {
    id: snap.id,
    userId: data.userId,
    createdAt: (data.createdAt as Timestamp | null)?.toDate() ?? new Date(),
    targetRole: data.targetRole,
    resumeSnippet: data.resumeSnippet,
    overallScore: data.overallScore,
    atsScore: data.atsScore,
    result: data.result,
  };
}

/* ─── Delete a single analysis ─────────────────────────────── */
export async function deleteResumeAnalysis(
  userId: string,
  analysisId: string,
): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    throw new Error("Firestore is not configured.");
  }
  const ref = doc(db, "users", userId, "resumeAnalyses", analysisId);
  await deleteDoc(ref);
}

/* ─────────────────────────────────────────────────────────────
   Interview History
   Path: users/{userId}/interviewHistory
   ──────────────────────────────────────────────────────────── */

export interface InterviewRecord {
  id: string;
  userId: string;
  category: string;
  categoryName: string;
  difficulty: string;
  score: number;           // avg evaluation score (1–10)
  questionsAnswered: number;
  totalQuestions: number;
  durationMin: number;     // session duration in minutes
  completedAt: Date;
}

interface RawInterviewDoc {
  userId: string;
  category: string;
  categoryName: string;
  difficulty: string;
  score: number;
  questionsAnswered: number;
  totalQuestions: number;
  durationMin: number;
  completedAt: Timestamp | null;
}

/** Persist a completed practice session. */
export async function saveInterviewRecord(
  userId: string,
  record: Omit<InterviewRecord, "id" | "userId" | "completedAt">,
): Promise<string> {
  if (!isFirebaseConfigured || !db) throw new Error("Firestore is not configured.");

  const col = collection(db, "users", userId, "interviewHistory");
  const ref = await addDoc(col, {
    userId,
    ...record,
    completedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Fetch a user's interview session history (newest first). */
export async function fetchInterviewHistory(
  userId: string,
  maxResults = 50,
): Promise<InterviewRecord[]> {
  if (!isFirebaseConfigured || !db) return [];

  const col = collection(db, "users", userId, "interviewHistory");
  const q = query(col, orderBy("completedAt", "desc"), limit(maxResults));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data() as RawInterviewDoc;
    return {
      id: d.id,
      userId: data.userId,
      category: data.category,
      categoryName: data.categoryName,
      difficulty: data.difficulty,
      score: data.score,
      questionsAnswered: data.questionsAnswered,
      totalQuestions: data.totalQuestions,
      durationMin: data.durationMin,
      completedAt: (data.completedAt as Timestamp | null)?.toDate() ?? new Date(),
    };
  });
}

/* ─── Fetch a user's analysis history ──────────────────────── */
export async function fetchResumeAnalysisHistory(
  userId: string,
  maxResults = 20,
): Promise<SavedAnalysis[]> {
  if (!isFirebaseConfigured || !db) return [];

  const col = collection(db, "users", userId, "resumeAnalyses");
  const q = query(col, orderBy("createdAt", "desc"), limit(maxResults));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data() as RawAnalysisDoc;
    return {
      id: d.id,
      userId: data.userId,
      createdAt: (data.createdAt as Timestamp | null)?.toDate() ?? new Date(),
      targetRole: data.targetRole,
      resumeSnippet: data.resumeSnippet,
      overallScore: data.overallScore,
      atsScore: data.atsScore,
      result: data.result,
    };
  });
}
