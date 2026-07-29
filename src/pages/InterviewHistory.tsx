import { useState, useEffect, useMemo, memo } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { fetchInterviewHistory, type InterviewRecord } from "@/lib/firestore";
import { isFirebaseConfigured } from "@/lib/firebase";
import {
  History, AlertCircle, Star, Clock, BookOpen,
  CheckCircle2, ArrowRight, RotateCcw, TrendingUp,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────

function relativeDate(date: Date): string {
  const diffMs  = Date.now() - date.getTime();
  const diffDay = Math.floor(diffMs / 86_400_000);
  if (diffDay === 0) return "Today";
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7)  return `${diffDay} days ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const difficultyMeta: Record<string, { badgeClass: string; dot: string }> = {
  beginner:     { badgeClass: "bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400",  dot: "bg-green-500"  },
  intermediate: { badgeClass: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", dot: "bg-yellow-500" },
  advanced:     { badgeClass: "bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400",    dot: "bg-red-500"    },
};

function scoreColor(s: number) {
  if (s >= 8) return "text-green-600 dark:text-green-400";
  if (s >= 6) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-500";
}

// ── History Card ────────────────────────────────────────────────────────────

const HistoryCard = memo(function HistoryCard({ record, index }: { record: InterviewRecord; index: number }) {
  const [, navigate] = useLocation();
  const meta = difficultyMeta[record.difficulty] ?? difficultyMeta.intermediate;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.32 }}
    >
      <Card className="border-border/60 hover:border-primary/40 hover:shadow-sm transition-all">
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">

            {/* Left: title + badges */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-semibold text-sm truncate">{record.categoryName}</span>
                <Badge
                  variant="secondary"
                  className={`text-xs capitalize gap-1.5 ${meta.badgeClass}`}
                >
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                  {record.difficulty}
                </Badge>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" />
                  {record.questionsAnswered}/{record.totalQuestions} questions
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {record.durationMin} min
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  {relativeDate(record.completedAt)}
                </span>
              </div>
            </div>

            {/* Right: score + actions */}
            <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 shrink-0">
              <div className={`text-2xl font-bold tabular-nums ${scoreColor(record.score)}`}>
                {record.score.toFixed(1)}<span className="text-sm font-normal text-muted-foreground">/10</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5 h-8"
                  onClick={() => navigate(`/practice/${record.category}?difficulty=${record.difficulty}`)}
                >
                  <RotateCcw className="h-3 w-3" />
                  Retry
                </Button>
                <Button
                  size="sm"
                  className="text-xs gap-1.5 h-8"
                  onClick={() => navigate(`/practice/${record.category}?difficulty=${record.difficulty}`)}
                >
                  Practice Again
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

// ── Skeleton row ────────────────────────────────────────────────────────────
function HistorySkeleton() {
  return (
    <Card className="border-border/60">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Summary bar ────────────────────────────────────────────────────────────
const SummaryBar = memo(function SummaryBar({ records }: { records: InterviewRecord[] }) {
  const avgScore   = records.length
    ? records.reduce((s, r) => s + r.score, 0) / records.length
    : 0;
  const bestScore  = records.length ? Math.max(...records.map((r) => r.score)) : 0;
  const totalTime  = records.reduce((s, r) => s + r.durationMin, 0);

  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      {[
        { label: "Sessions", value: String(records.length), icon: <History className="h-4 w-4" /> },
        { label: "Avg Score", value: records.length ? `${avgScore.toFixed(1)}/10` : "—", icon: <Star className="h-4 w-4" /> },
        { label: "Best Score", value: records.length ? `${bestScore.toFixed(1)}/10` : "—", icon: <TrendingUp className="h-4 w-4" /> },
      ].map((s) => (
        <Card key={s.label} className="border-border/60">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              {s.icon} {s.label}
            </div>
            <div className="text-xl font-bold tabular-nums">{s.value}</div>
            {s.label === "Sessions" && totalTime > 0 && (
              <div className="text-xs text-muted-foreground mt-0.5">{totalTime} min total</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

// ── Main page ───────────────────────────────────────────────────────────────

type FilterDifficulty = "all" | "beginner" | "intermediate" | "advanced";

export default function InterviewHistory() {
  const { user }  = useAuth();
  const [records, setRecords]     = useState<InterviewRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [filter, setFilter]       = useState<FilterDifficulty>("all");

  useEffect(() => {
    if (!user || !isFirebaseConfigured) { setLoading(false); return; }
    setLoading(true);
    setFetchError(false);
    fetchInterviewHistory(user.uid, 100)
      .then(setRecords)
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = useMemo(
    () => filter === "all" ? records : records.filter((r) => r.difficulty === filter),
    [records, filter],
  );

  const filterBtns: { label: string; value: FilterDifficulty }[] = [
    { label: "All",          value: "all"          },
    { label: "Beginner",     value: "beginner"     },
    { label: "Intermediate", value: "intermediate" },
    { label: "Advanced",     value: "advanced"     },
  ];

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <History className="h-5 w-5" />
          </div>
          <h1 className="text-3xl font-bold">Interview History</h1>
        </div>
        <p className="text-muted-foreground">
          All your completed practice sessions — sorted newest first.
        </p>
      </motion.div>

      {/* Summary stats (only when data exists) */}
      {!loading && records.length > 0 && <SummaryBar records={records} />}

      {/* Filters */}
      {!loading && records.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {filterBtns.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      )}

      {/* Error */}
      {fetchError && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 mb-6">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Couldn't load your history. Check your connection and refresh.
        </div>
      )}

      {/* Content */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <HistorySkeleton key={i} />)
        ) : filtered.length === 0 ? (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <History className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">
                {filter === "all" ? "No sessions yet" : `No ${filter} sessions yet`}
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                {filter === "all"
                  ? "Complete a practice session and finish it to see it here."
                  : `You haven't completed any ${filter} sessions yet.`}
              </p>
              <Button asChild>
                <Link href="/categories">Start Practicing</Link>
              </Button>
            </motion.div>
          </AnimatePresence>
        ) : (
          filtered.map((r, i) => (
            <HistoryCard key={r.id} record={r} index={i} />
          ))
        )}
      </div>

    </div>
  );
}
