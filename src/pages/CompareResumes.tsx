import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { fetchSingleAnalysis, type SavedAnalysis } from "@/lib/firestore";
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus,
  AlertCircle, Lightbulb, CheckCircle2, Target,
  Tag, Zap, Calendar, GitCompare,
} from "lucide-react";

/* ════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════ */
function scoreColor(s: number) {
  if (s >= 80) return "#16a34a";
  if (s >= 60) return "#d97706";
  return "#dc2626";
}
function scoreBg(s: number) {
  if (s >= 80) return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400";
  if (s >= 60) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400";
  return "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400";
}

function isPIILine(line: string): boolean {
  if (!line) return true;
  if (/\S+@\S+/.test(line)) return true;
  if (/https?:\/\//.test(line)) return true;
  if (/(?:linkedin|github|twitter)\.com/i.test(line)) return true;
  if (/^[\d\s\-+().]{7,}$/.test(line)) return true;
  return false;
}
function getResumeTitle(snippet: string, fallback: string): string {
  const lines = snippet.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (isPIILine(line)) continue;
    return line.length > 55 ? line.slice(0, 55) + "…" : line;
  }
  return fallback;
}

/* ─── Score ring (static, no animation, small) ─────────────── */
function ScoreCircle({ score }: { score: number }) {
  const size = 56;
  const r = size * 0.38;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="currentColor"
          strokeWidth={size * 0.08} className="text-muted/30" />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={color}
          strokeWidth={size * 0.08} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-bold text-xs" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

/* ─── Diff indicator ────────────────────────────────────────── */
function Diff({ diff }: { diff: number }) {
  if (diff > 0) return (
    <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-bold text-sm">
      <TrendingUp className="h-3.5 w-3.5" />+{diff}
    </div>
  );
  if (diff < 0) return (
    <div className="flex items-center gap-1 text-red-500 font-bold text-sm">
      <TrendingDown className="h-3.5 w-3.5" />{diff}
    </div>
  );
  return (
    <div className="flex items-center gap-1 text-muted-foreground text-sm">
      <Minus className="h-3.5 w-3.5" />0
    </div>
  );
}

/* ─── Score comparison row ──────────────────────────────────── */
function ScoreRow({ label, a, b }: { label: string; a: number | null; b: number | null }) {
  const aVal = a ?? 0;
  const bVal = b ?? 0;
  const diff = bVal - aVal;

  const cellClass = (val: number | null) =>
    `flex items-center justify-center gap-2 py-3 ${val == null ? "text-muted-foreground text-xs" : ""}`;

  return (
    <div className="grid grid-cols-[1fr_72px_72px_72px_1fr] items-center border-b border-border/50 last:border-0">
      {/* A score */}
      <div className={cellClass(a)}>
        {a != null ? (
          <>
            <ScoreCircle score={a} />
            <span className={`text-sm font-bold tabular-nums ${scoreBg(a)} px-2 py-0.5 rounded`}>{a}%</span>
          </>
        ) : <span>—</span>}
      </div>

      {/* A bar */}
      <div className="px-1">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${aVal}%`, backgroundColor: scoreColor(aVal) }} />
        </div>
      </div>

      {/* Diff pill — center */}
      <div className="flex flex-col items-center gap-0.5">
        <Diff diff={diff} />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>

      {/* B bar */}
      <div className="px-1">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${bVal}%`, backgroundColor: scoreColor(bVal) }} />
        </div>
      </div>

      {/* B score */}
      <div className={cellClass(b)}>
        {b != null ? (
          <>
            <span className={`text-sm font-bold tabular-nums ${scoreBg(b)} px-2 py-0.5 rounded`}>{b}%</span>
            <ScoreCircle score={b} />
          </>
        ) : <span>—</span>}
      </div>
    </div>
  );
}

/* ─── Side-by-side list section ─────────────────────────────── */
function ListSection({
  icon, title, colorClass, itemsA, itemsB,
}: {
  icon: React.ReactNode;
  title: string;
  colorClass: string;
  itemsA: string[];
  itemsB: string[];
}) {
  const maxLen = Math.max(itemsA.length, itemsB.length);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className={`text-base flex items-center gap-2 ${colorClass}`}>
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {maxLen === 0 ? (
          <p className="text-sm text-muted-foreground">None</p>
        ) : (
          <div className="grid grid-cols-2 gap-0 divide-x divide-border/60">
            {/* A column */}
            <div className="pr-4 space-y-2">
              {itemsA.map((item, i) => (
                <div key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="shrink-0 mt-0.5 font-bold" style={{ color: colorClass.includes("green") ? "#16a34a" : colorClass.includes("red") ? "#dc2626" : "#3b82f6" }}>•</span>
                  {item}
                </div>
              ))}
              {itemsA.length === 0 && <p className="text-xs text-muted-foreground">None</p>}
            </div>
            {/* B column */}
            <div className="pl-4 space-y-2">
              {itemsB.map((item, i) => (
                <div key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="shrink-0 mt-0.5 font-bold" style={{ color: colorClass.includes("green") ? "#16a34a" : colorClass.includes("red") ? "#dc2626" : "#3b82f6" }}>•</span>
                  {item}
                </div>
              ))}
              {itemsB.length === 0 && <p className="text-xs text-muted-foreground">None</p>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Tag pill list ─────────────────────────────────────────── */
function TagList({ items, variant }: { items: string[]; variant: "green" | "red" | "blue" }) {
  const cls =
    variant === "green" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200/60 dark:border-green-800/40"
    : variant === "red" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border-red-200/60 dark:border-red-800/40"
    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200/60 dark:border-blue-800/40";
  if (items.length === 0) return <p className="text-xs text-muted-foreground">None</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <span key={s} className={`px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{s}</span>
      ))}
    </div>
  );
}

/* ─── Skeleton loader ────────────────────────────────────────── */
function CompareSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}

/* ════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════ */
export default function CompareResumes() {
  const { user } = useAuth();
  const search = useSearch();

  const params = new URLSearchParams(search);
  const idA = params.get("a") ?? "";
  const idB = params.get("b") ?? "";

  const [analysisA, setAnalysisA] = useState<SavedAnalysis | null>(null);
  const [analysisB, setAnalysisB] = useState<SavedAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user || !idA || !idB) { setLoading(false); return; }

    setLoading(true);
    setError(false);
    Promise.all([
      fetchSingleAnalysis(user.uid, idA),
      fetchSingleAnalysis(user.uid, idB),
    ])
      .then(([a, b]) => {
        if (!a || !b) { setError(true); return; }
        /* Sort by date — older on left (A), newer on right (B) */
        if (a.createdAt <= b.createdAt) { setAnalysisA(a); setAnalysisB(b); }
        else { setAnalysisA(b); setAnalysisB(a); }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [user, idA, idB]);

  /* ── Error / missing params ── */
  if (!idA || !idB) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-4xl text-center flex flex-col items-center gap-5">
        <AlertCircle className="h-12 w-12 text-destructive/60" />
        <div>
          <h2 className="text-xl font-semibold mb-1">Missing analyses</h2>
          <p className="text-sm text-muted-foreground">Select two analyses from My Analyses to compare.</p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/my-analyses"><ArrowLeft className="h-4 w-4" /> My Analyses</Link>
        </Button>
      </div>
    );
  }

  /* ── Derived comparison values (only when loaded) ── */
  const kwScoreA = analysisA?.result.keywordAnalysis?.length
    ? Math.round((analysisA.result.keywordAnalysis.filter((k) => k.found).length / analysisA.result.keywordAnalysis.length) * 100)
    : 0;
  const kwScoreB = analysisB?.result.keywordAnalysis?.length
    ? Math.round((analysisB.result.keywordAnalysis.filter((k) => k.found).length / analysisB.result.keywordAnalysis.length) * 100)
    : 0;

  const titleA = analysisA ? getResumeTitle(analysisA.resumeSnippet, "Earlier Resume") : "";
  const titleB = analysisB ? getResumeTitle(analysisB.resumeSnippet, "Later Resume") : "";

  /* Missing skills unique to each */
  const missingSkillsA = analysisA?.result.skillGapAnalysis?.missingSkills ?? [];
  const missingSkillsB = analysisB?.result.skillGapAnalysis?.missingSkills ?? [];

  /* Skills fixed (in A's missing but NOT in B's missing) */
  const skillsFixed = missingSkillsA.filter((s) => !missingSkillsB.includes(s));
  /* New gaps (in B's missing but NOT in A's missing) */
  const newGaps = missingSkillsB.filter((s) => !missingSkillsA.includes(s));

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2 mb-3 text-muted-foreground hover:text-foreground" asChild>
          <Link href="/my-analyses"><ArrowLeft className="h-4 w-4" /> My Analyses</Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <GitCompare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Resume Comparison</h1>
            <p className="text-sm text-muted-foreground">
              Older analysis (left) vs newer analysis (right) — green = improved, red = decreased.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <CompareSkeleton />
      ) : error || !analysisA || !analysisB ? (
        <div className="flex flex-col items-center gap-5 py-20 text-center">
          <AlertCircle className="h-12 w-12 text-destructive/60" />
          <div>
            <h2 className="text-xl font-semibold mb-1">Couldn't load analyses</h2>
            <p className="text-sm text-muted-foreground">One or both analyses could not be found.</p>
          </div>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/my-analyses"><ArrowLeft className="h-4 w-4" /> Back</Link>
          </Button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-6"
        >
          {/* ── Identity cards ── */}
          <div className="grid grid-cols-2 gap-4">
            {([
              { label: "Earlier", analysis: analysisA, title: titleA },
              { label: "Later", analysis: analysisB, title: titleB },
            ] as const).map(({ label, analysis, title }) => (
              <Card key={label} className="border-border/60">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant="outline" className={`text-xs font-semibold ${label === "Earlier" ? "border-muted-foreground/40 text-muted-foreground" : "border-primary/60 text-primary"}`}>
                      {label}
                    </Badge>
                  </div>
                  <div className="font-semibold text-sm truncate">{title}</div>
                  {analysis.targetRole && analysis.targetRole !== "General" && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Target className="h-3 w-3" />{analysis.targetRole}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3" />
                    {analysis.createdAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Score overview ── */}
          <Card className="border-border/60 overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-primary via-blue-400 to-cyan-400" />
            <CardHeader className="pb-0">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Score Overview
              </CardTitle>
              {/* Column labels */}
              <div className="grid grid-cols-[1fr_72px_72px_72px_1fr] text-xs text-muted-foreground pt-2">
                <div className="text-center font-medium">Earlier</div>
                <div />
                <div className="text-center">Change</div>
                <div />
                <div className="text-center font-medium">Later</div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <ScoreRow label="Overall" a={analysisA.overallScore} b={analysisB.overallScore} />
              <ScoreRow label="ATS Score" a={analysisA.atsScore} b={analysisB.atsScore} />
              <ScoreRow label="Keywords" a={kwScoreA} b={kwScoreB} />
            </CardContent>
          </Card>

          {/* ── Column headers for side-by-side sections ── */}
          <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            <span>Earlier Analysis</span>
            <span>Later Analysis</span>
          </div>

          {/* ── Strengths ── */}
          <ListSection
            icon={<CheckCircle2 className="h-4 w-4" />}
            title="Strengths"
            colorClass="text-green-600 dark:text-green-400"
            itemsA={analysisA.result.strengths}
            itemsB={analysisB.result.strengths}
          />

          {/* ── Weaknesses ── */}
          <ListSection
            icon={<AlertCircle className="h-4 w-4" />}
            title="Areas to Improve"
            colorClass="text-red-500"
            itemsA={analysisA.result.weaknesses}
            itemsB={analysisB.result.weaknesses}
          />

          {/* ── Missing Skills diff ── */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" /> Missing Skills
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {skillsFixed.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">
                    <TrendingUp className="h-3.5 w-3.5" /> Skills Acquired ({skillsFixed.length})
                  </div>
                  <TagList items={skillsFixed} variant="green" />
                </div>
              )}
              {newGaps.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-red-500 uppercase tracking-wider">
                    <TrendingDown className="h-3.5 w-3.5" /> New Skill Gaps ({newGaps.length})
                  </div>
                  <TagList items={newGaps} variant="red" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground font-medium">Earlier — all missing</div>
                  <TagList items={missingSkillsA} variant="red" />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground font-medium">Later — all missing</div>
                  <TagList items={missingSkillsB} variant="red" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── AI Suggestions ── */}
          <ListSection
            icon={<Lightbulb className="h-4 w-4" />}
            title="AI Suggestions"
            colorClass="text-primary"
            itemsA={analysisA.result.suggestions}
            itemsB={analysisB.result.suggestions}
          />

          {/* ── Keyword match detail ── */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" /> Keyword Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { analysis: analysisA, kwScore: kwScoreA, label: "Earlier" },
                  { analysis: analysisB, kwScore: kwScoreB, label: "Later" },
                ].map(({ analysis, kwScore, label }) => {
                  const found = analysis.result.keywordAnalysis?.filter((k) => k.found) ?? [];
                  const missing = analysis.result.keywordAnalysis?.filter((k) => !k.found) ?? [];
                  return (
                    <div key={label} className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Coverage</span>
                        <span className="font-bold" style={{ color: scoreColor(kwScore) }}>{kwScore}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${kwScore}%`, backgroundColor: scoreColor(kwScore) }} />
                      </div>
                      <div className="flex gap-3 text-xs">
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                          <Zap className="h-3 w-3" />{found.length} found
                        </span>
                        <span className="flex items-center gap-1 text-red-500 font-medium">
                          {missing.length} missing
                        </span>
                      </div>
                      {missing.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {missing.slice(0, 8).map((k) => (
                            <span key={k.keyword} className="px-1.5 py-0.5 rounded text-[10px] bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40">
                              {k.keyword}
                            </span>
                          ))}
                          {missing.length > 8 && (
                            <span className="text-[10px] text-muted-foreground self-center">+{missing.length - 8}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── Resume snippets ── */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resume Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-0 divide-x divide-border/60">
                <div className="pr-4">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Earlier</div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                    {analysisA.resumeSnippet}
                  </p>
                </div>
                <div className="pl-4">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Later</div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                    {analysisB.resumeSnippet}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Footer actions ── */}
          <div className="flex items-center justify-between pt-2 pb-6">
            <Button asChild variant="outline" className="gap-2">
              <Link href="/my-analyses"><ArrowLeft className="h-4 w-4" /> Back to My Analyses</Link>
            </Button>
            <div className="flex gap-3">
              <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs">
                <Link href={`/my-analyses/${idA}`}>View Earlier Report</Link>
              </Button>
              <Button asChild size="sm" className="gap-1.5 text-xs">
                <Link href={`/my-analyses/${idB}`}>View Later Report</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
