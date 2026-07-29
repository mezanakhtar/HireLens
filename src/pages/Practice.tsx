import { useState, useRef, useCallback } from "react";
import { useParams, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  useGenerateInterviewQuestions, useEvaluateAnswer,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/useAuth";
import { saveInterviewRecord } from "@/lib/firestore";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, ChevronRight, Star, CheckCircle2, AlertCircle, Lightbulb, Flag } from "lucide-react";

const categoryLabels: Record<string, string> = {
  technical: "Technical Interview",
  hr: "HR Interview",
  behavioral: "Behavioral Interview",
  "system-design": "System Design",
  "ml-ai": "ML / AI Interview",
  dsa: "DSA Practice",
};

interface EvaluationState {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  modelAnswer: string | null;
}

export default function Practice() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const search = useSearch();
  const { user } = useAuth();
  const { toast } = useToast();
  const [role, setRole] = useState("");
  const [techStack, setTechStack] = useState("");

  // Pre-fill difficulty from ?difficulty= query param (set by DifficultySelect page)
  const urlDifficulty = new URLSearchParams(search).get("difficulty");
  const initialDifficulty =
    urlDifficulty === "beginner" || urlDifficulty === "advanced" ? urlDifficulty : "intermediate";
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [count, setCount] = useState("6");
  const [questions, setQuestions] = useState<Array<{
    id: string; question: string; category: string; difficulty: string; hint?: string | null; sampleAnswer?: string | null;
  }>>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [evaluations, setEvaluations] = useState<Record<string, EvaluationState>>({});
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);

  // Session tracking for history
  const sessionStartRef = useRef(Date.now());
  const [isSaving, setIsSaving] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);

  const generateMutation = useGenerateInterviewQuestions();
  const evaluateMutation = useEvaluateAnswer();

  const handleGenerate = () => {
    if (!role.trim()) {
      toast({ title: "Role required", description: "Please enter a job role.", variant: "destructive" });
      return;
    }
    generateMutation.mutate(
      { data: { role, techStack: techStack || null, interviewType: categoryId as never, difficulty: difficulty as never, count: parseInt(count) } },
      {
        onSuccess: (data) => {
          setQuestions(data.questions);
          setAnswers({});
          setEvaluations({});
          // Reset session tracking for the new batch
          sessionStartRef.current = Date.now();
          setSessionSaved(false);
        },
        onError: () => toast({ title: "Error", description: "Failed to generate questions.", variant: "destructive" }),
      }
    );
  };

  const handleEvaluate = (questionId: string, question: string) => {
    const answer = answers[questionId];
    if (!answer?.trim()) {
      toast({ title: "Answer required", description: "Please type your answer first.", variant: "destructive" });
      return;
    }
    setEvaluatingId(questionId);
    evaluateMutation.mutate(
      { data: { question, answer, interviewType: categoryId as never, role: role || null } },
      {
        onSuccess: (data) => {
          setEvaluations((prev) => ({ ...prev, [questionId]: data as EvaluationState }));
          setEvaluatingId(null);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to evaluate answer.", variant: "destructive" });
          setEvaluatingId(null);
        },
      }
    );
  };

  const scoreColor = (s: number) =>
    s >= 8 ? "text-green-600 dark:text-green-400" : s >= 6 ? "text-yellow-600 dark:text-yellow-400" : "text-red-500";

  // ── Finish & save session ──
  const handleFinish = useCallback(async () => {
    const evalEntries = Object.values(evaluations);
    if (evalEntries.length === 0 || !user) return;

    const avgScore   = Math.round((evalEntries.reduce((s, e) => s + e.score, 0) / evalEntries.length) * 10) / 10;
    const durationMin = Math.max(1, Math.round((Date.now() - sessionStartRef.current) / 60_000));

    if (!isFirebaseConfigured) {
      toast({ title: "Session not saved", description: "Firebase is not configured." });
      return;
    }

    setIsSaving(true);
    try {
      await saveInterviewRecord(user.uid, {
        category:         categoryId ?? "",
        categoryName:     categoryLabels[categoryId ?? ""] ?? (categoryId ?? ""),
        difficulty,
        score:            avgScore,
        questionsAnswered: evalEntries.length,
        totalQuestions:   questions.length,
        durationMin,
      });
      setSessionSaved(true);
      toast({ title: "Session saved! 🎉", description: "Check Interview History to track your progress." });
    } catch {
      toast({ title: "Save failed", description: "Couldn't save session. Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [evaluations, questions.length, categoryId, difficulty, user, toast]);

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Badge variant="secondary" className="mb-3 capitalize">{categoryLabels[categoryId] ?? categoryId}</Badge>
        <h1 className="text-3xl font-bold">Practice Session</h1>
        <p className="text-muted-foreground mt-1">Configure your session and generate AI-powered interview questions.</p>
      </motion.div>

      {/* Config Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="mt-8 border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Session Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Target Role *</Label>
                <Input
                  placeholder="e.g. Software Engineer, Data Scientist"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  data-testid="input-role"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tech Stack (optional)</Label>
                <Input
                  placeholder="e.g. React, Node.js, Python"
                  value={techStack}
                  onChange={(e) => setTechStack(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger data-testid="select-difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Number of Questions</Label>
                <Select value={count} onValueChange={setCount}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 questions</SelectItem>
                    <SelectItem value="6">6 questions</SelectItem>
                    <SelectItem value="8">8 questions</SelectItem>
                    <SelectItem value="10">10 questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="gap-2"
              data-testid="button-generate"
            >
              <Sparkles className="h-4 w-4" />
              {generateMutation.isPending ? "Generating..." : "Generate Questions"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Loading */}
      {generateMutation.isPending && (
        <div className="mt-8 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Questions */}
      <AnimatePresence>
        {questions.length > 0 && !generateMutation.isPending && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            <h2 className="text-xl font-semibold mb-4">
              {questions.length} Questions Generated
            </h2>
            <Accordion type="multiple" className="space-y-3">
              {questions.map((q, i) => {
                const eval_ = evaluations[q.id];
                return (
                  <AccordionItem
                    key={q.id}
                    value={q.id}
                    className="border border-border/60 rounded-xl px-4 bg-card"
                    data-testid={`question-item-${i}`}
                  >
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-start gap-3 text-left">
                        <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm leading-relaxed">{q.question}</p>
                          {eval_ && (
                            <span className={`text-xs font-semibold mt-1 inline-flex items-center gap-1 ${scoreColor(eval_.score)}`}>
                              <Star className="h-3 w-3" /> {eval_.score}/10
                            </span>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 space-y-4">
                      {q.hint && (
                        <div className="flex gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">
                          <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span><strong>Hint:</strong> {q.hint}</span>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <Label>Your Answer</Label>
                        <Textarea
                          placeholder="Type your answer here..."
                          value={answers[q.id] ?? ""}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          rows={4}
                          data-testid={`textarea-answer-${i}`}
                        />
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEvaluate(q.id, q.question)}
                        disabled={evaluatingId === q.id}
                        className="gap-2"
                        data-testid={`button-evaluate-${i}`}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                        {evaluatingId === q.id ? "Evaluating..." : "Evaluate My Answer"}
                      </Button>

                      {/* Evaluation Result */}
                      {eval_ && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-3 border border-border/60 rounded-xl p-4 bg-muted/20"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`text-2xl font-bold ${scoreColor(eval_.score)}`}>{eval_.score}/10</div>
                            <p className="text-sm text-muted-foreground">{eval_.feedback}</p>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-3 text-sm">
                            <div>
                              <div className="flex items-center gap-1.5 font-medium text-green-600 dark:text-green-400 mb-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Strengths
                              </div>
                              <ul className="space-y-1">
                                {eval_.strengths.map((s) => (
                                  <li key={s} className="text-muted-foreground text-xs flex gap-1.5">
                                    <span className="text-green-500 mt-0.5">+</span> {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 font-medium text-yellow-600 dark:text-yellow-400 mb-1.5">
                                <AlertCircle className="h-3.5 w-3.5" /> Improvements
                              </div>
                              <ul className="space-y-1">
                                {eval_.improvements.map((s) => (
                                  <li key={s} className="text-muted-foreground text-xs flex gap-1.5">
                                    <span className="text-yellow-500 mt-0.5">~</span> {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          {eval_.modelAnswer && (
                            <div className="text-sm border-t border-border/60 pt-3">
                              <div className="font-medium mb-1 text-xs uppercase tracking-wide text-muted-foreground">Model Answer</div>
                              <p className="text-muted-foreground text-xs leading-relaxed">{eval_.modelAnswer}</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>

            {/* ── Finish & Save Session ── */}
            {Object.keys(evaluations).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-8 border border-border/60 rounded-xl p-5 bg-muted/20"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-sm mb-0.5">Session Summary</p>
                    <p className="text-xs text-muted-foreground">
                      {Object.keys(evaluations).length}/{questions.length} questions evaluated
                      {(() => {
                        const entries = Object.values(evaluations);
                        const avg = entries.reduce((s, e) => s + e.score, 0) / entries.length;
                        return ` · Avg score: ${avg.toFixed(1)}/10`;
                      })()}
                    </p>
                  </div>
                  <Button
                    onClick={handleFinish}
                    disabled={isSaving || sessionSaved}
                    className="gap-2 shrink-0"
                    variant={sessionSaved ? "outline" : "default"}
                    aria-label="Finish and save this practice session to your history"
                  >
                    <Flag className="h-4 w-4" aria-hidden="true" />
                    {sessionSaved
                      ? "✓ Session Saved"
                      : isSaving
                        ? "Saving…"
                        : "Finish & Save Session"}
                  </Button>
                </div>
              </motion.div>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
