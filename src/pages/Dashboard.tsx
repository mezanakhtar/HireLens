import { useState, useEffect, useMemo, memo } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchResumeAnalysisHistory, type SavedAnalysis,
  fetchInterviewHistory, type InterviewRecord,
} from "@/lib/firestore";
import { isFirebaseConfigured } from "@/lib/firebase";
import {
  BrainCircuit, FileText, MessageSquare, ArrowRight,
  Lightbulb, TrendingUp, Clock, Star, AlertCircle,
  History, Target,
} from "lucide-react";

// ── Static data ──────────────────────────────────────────────────────────────
const quickActions = [
  {
    title: "Start Mock Interview",
    desc:  "Practice with an AI interviewer in real-time",
    icon:  <MessageSquare className="h-5 w-5" />,
    href:  "/mock-interview",
    color: "bg-primary text-primary-foreground",
  },
  {
    title: "Analyze Resume",
    desc:  "Get ATS score and improvement suggestions",
    icon:  <FileText className="h-5 w-5" />,
    href:  "/resume",
    color: "bg-secondary text-secondary-foreground",
  },
  {
    title: "Browse Categories",
    desc:  "Practice by interview type or tech stack",
    icon:  <BrainCircuit className="h-5 w-5" />,
    href:  "/categories",
    color: "bg-secondary text-secondary-foreground",
  },
  {
    title: "Get Interview Tips",
    desc:  "Curated tips from hiring experts",
    icon:  <Lightbulb className="h-5 w-5" />,
    href:  "/tips",
    color: "bg-secondary text-secondary-foreground",
  },
];

const tips = [
  "Use the STAR method for behavioral questions.",
  "Always clarify constraints before coding.",
  "Think out loud during technical interviews.",
  "Ask insightful questions at the end of every interview.",
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.35 },
  }),
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function relativeTime(date: Date): string {
  const diffMs  = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7)  return `${diffDay} days ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function scoreColor(s: number) {
  if (s >= 8) return "text-green-600 dark:text-green-400";
  if (s >= 6) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-500";
}

// ── Score sparkline ──────────────────────────────────────────────────────────
const Sparkline = memo(function Sparkline({ scores }: { scores: number[] }) {
  if (scores.length === 0) return null;
  const maxScore = 10;
  return (
    <div className="flex items-end gap-1 h-8" role="img" aria-label={`Score trend: ${scores.join(", ")}`}>
      {scores.map((s, i) => {
        const heightPct = Math.max(10, (s / maxScore) * 100);
        const color =
          s >= 8 ? "bg-green-500" : s >= 6 ? "bg-yellow-500" : "bg-red-500";
        return (
          <div
            key={i}
            className={`flex-1 rounded-sm ${color} opacity-80`}
            style={{ height: `${heightPct}%` }}
            title={`${s}/10`}
          />
        );
      })}
    </div>
  );
});

// ── Stat card skeleton ───────────────────────────────────────────────────────
function StatSkeleton() {
  return (
    <Card className="border-border/60">
      <CardContent className="pt-5 space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-7 w-12" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const firstName =
    user?.displayName?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";

  const [analyses,  setAnalyses]  = useState<SavedAnalysis[]>([]);
  const [sessions,  setSessions]  = useState<InterviewRecord[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (!user || !isFirebaseConfigured) { setLoading(false); return; }
    setLoading(true);
    setFetchError(false);

    Promise.all([
      fetchResumeAnalysisHistory(user.uid, 10),
      fetchInterviewHistory(user.uid, 50),
    ])
      .then(([a, s]) => { setAnalyses(a); setSessions(s); })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [user]);

  // ── Computed interview stats ──
  const interviewStats = useMemo(() => {
    if (sessions.length === 0) return null;
    const avg  = sessions.reduce((s, r) => s + r.score, 0) / sessions.length;
    const best = Math.max(...sessions.map((r) => r.score));
    const last = sessions[0]?.completedAt;
    return { count: sessions.length, avg, best, last };
  }, [sessions]);

  const recentScores = useMemo(
    () => sessions.slice(0, 8).map((r) => r.score),
    [sessions],
  );

  const stats = [
    {
      label: "Total Interviews",
      value: loading ? "—" : String(sessions.length),
      icon:  <MessageSquare className="h-4 w-4" />,
      trend: sessions.length === 0 ? "no sessions yet" : `${sessions.length} session${sessions.length > 1 ? "s" : ""} completed`,
    },
    {
      label: "Avg Interview Score",
      value: loading ? "—" : interviewStats ? `${interviewStats.avg.toFixed(1)}/10` : "—",
      icon:  <Star className="h-4 w-4" />,
      trend: interviewStats ? "across all sessions" : "no sessions yet",
    },
    {
      label: "Best Score",
      value: loading ? "—" : interviewStats ? `${interviewStats.best.toFixed(1)}/10` : "—",
      icon:  <TrendingUp className="h-4 w-4" />,
      trend: interviewStats ? "your personal best" : "no sessions yet",
    },
    {
      label: "Last Practice",
      value: loading
        ? "—"
        : interviewStats?.last
          ? relativeTime(interviewStats.last)
          : "—",
      icon:  <Clock className="h-4 w-4" />,
      trend: interviewStats ? "most recent session" : "no sessions yet",
    },
  ];

  // ── Recent activity: merge sessions + analyses, sort by date ──
  type ActivityItem =
    | { kind: "interview"; record: InterviewRecord }
    | { kind: "resume";    analysis: SavedAnalysis  };

  const recentActivity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [
      ...sessions.slice(0, 5).map((r) => ({ kind: "interview" as const, record: r })),
      ...analyses.slice(0, 5).map((a) => ({ kind: "resume"    as const, analysis: a })),
    ];
    items.sort((a, b) => {
      const da = a.kind === "interview" ? a.record.completedAt : a.analysis.createdAt;
      const db_ = b.kind === "interview" ? b.record.completedAt : b.analysis.createdAt;
      return db_.getTime() - da.getTime();
    });
    return items.slice(0, 6);
  }, [sessions, analyses]);

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-bold">Welcome back, {firstName}! 👋</h1>
        <p className="text-muted-foreground mt-1">
          Ready to improve your interview and resume performance today?
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          : stats.map((s, i) => (
              <motion.div key={s.label} custom={i} variants={fadeUp} initial="hidden" animate="show">
                <Card className="border-border/60">
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                      {s.icon}
                      <span className="truncate">{s.label}</span>
                    </div>
                    <div className="text-2xl font-bold tabular-nums">{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">{s.trend}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
      </div>

      {/* Firestore error banner */}
      {fetchError && (
        <div className="mt-4 flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Couldn't load your data. Check your connection and refresh.
        </div>
      )}

      {/* Progress section — only when sessions exist */}
      {!loading && sessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Card className="mt-6 border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" aria-hidden="true" />
                Progress Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-6">
                {/* Sparkline */}
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground mb-2">Score Trend (last {recentScores.length} sessions)</p>
                  <Sparkline scores={recentScores} />
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-green-500" />8–10</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-yellow-500" />6–7</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-red-500" />1–5</span>
                  </div>
                </div>

                {/* Quick numbers */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Interviews</span>
                    <span className="font-semibold tabular-nums">{sessions.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Avg Score</span>
                    <span className={`font-semibold tabular-nums ${interviewStats ? scoreColor(interviewStats.avg) : ""}`}>
                      {interviewStats ? `${interviewStats.avg.toFixed(1)}/10` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Best Score</span>
                    <span className={`font-semibold tabular-nums ${interviewStats ? scoreColor(interviewStats.best) : ""}`}>
                      {interviewStats ? `${interviewStats.best.toFixed(1)}/10` : "—"}
                    </span>
                  </div>
                  <div className="pt-1">
                    <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
                      <Link href="/interview-history">
                        View Full History <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main content */}
      <div className="grid lg:grid-cols-3 gap-6 mt-8">

        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Quick Start</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {quickActions.map((action, i) => (
              <motion.div key={action.title} custom={i} variants={fadeUp} initial="hidden" animate="show">
                <Link href={action.href}>
                  <Card className="group h-full border-border/60 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer">
                    <CardContent className="pt-5 flex flex-col h-full">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 ${action.color}`}>
                        {action.icon}
                      </div>
                      <div className="font-semibold text-sm group-hover:text-primary transition-colors">
                        {action.title}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex-1">{action.desc}</p>
                      <div className="mt-3 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        Go <ArrowRight className="h-3 w-3" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">

          {/* Recent Activity */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" aria-hidden="true" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                ))
              ) : recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No activity yet. Complete a practice session or analyze a resume to get started.
                </p>
              ) : (
                recentActivity.map((item, idx) => {
                  if (item.kind === "interview") {
                    const r = item.record;
                    return (
                      <div key={`int-${r.id}`} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium line-clamp-1">
                            {r.categoryName}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {r.difficulty} · {relativeTime(r.completedAt)}
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`shrink-0 tabular-nums text-xs ${scoreColor(r.score)}`}
                        >
                          {r.score.toFixed(1)}/10
                        </Badge>
                      </div>
                    );
                  }
                  const a = item.analysis;
                  return (
                    <div key={`res-${a.id}`} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium line-clamp-1">
                          Resume{a.targetRole && a.targetRole !== "General" ? ` — ${a.targetRole}` : ""}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {relativeTime(a.createdAt)}
                        </div>
                      </div>
                      <Badge variant="secondary" className="shrink-0 tabular-nums text-xs">
                        {a.overallScore}%
                      </Badge>
                    </div>
                  );
                })
              )}

              {!loading && (sessions.length > 0 || analyses.length > 0) && (
                <div className="flex flex-col gap-1 pt-1">
                  {sessions.length > 0 && (
                    <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
                      <Link href="/interview-history">
                        View Interview History <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                  {analyses.length > 0 && (
                    <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
                      <Link href="/my-analyses">
                        View Resume Analyses <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" aria-hidden="true" /> Quick Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tips.map((tip) => (
                <div key={tip} className="flex gap-2 text-sm text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  {tip}
                </div>
              ))}
              <Button variant="ghost" size="sm" className="w-full text-xs mt-2" asChild>
                <Link href="/tips">
                  View All Tips <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
