import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  fetchResumeAnalysisHistory,
  deleteResumeAnalysis,
  type SavedAnalysis,
} from "@/lib/firestore";
import { isFirebaseConfigured } from "@/lib/firebase";
import {
  FileText, AlertCircle, ArrowRight, Target,
  Calendar, TrendingUp, Zap, Search,
  GitCompare, X, ChevronRight, Trash2,
  SlidersHorizontal, ScanEye,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────── */
type SortKey = "newest" | "oldest" | "highest-overall" | "highest-ats" | "lowest-ats";

/* ─── Colour helpers ─────────────────────────────────────────── */
function scoreColor(s: number) {
  if (s >= 80) return "#16a34a";
  if (s >= 60) return "#d97706";
  return "#dc2626";
}
function scoreBadge(s: number) {
  if (s >= 80) return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400";
  if (s >= 60) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400";
  return "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400";
}

/* ─── Mini score ring ────────────────────────────────────────── */
function MiniRing({ score, label }: { score: number; label: string }) {
  const size = 60;
  const r = size * 0.38;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="currentColor"
            strokeWidth={size * 0.08} className="text-muted/30" />
          <circle cx={cx} cy={cx} r={r} fill="none" stroke={color}
            strokeWidth={size * 0.08} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-bold text-[11px] tabular-nums" style={{ color }}>{score}</span>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground leading-tight text-center">{label}</span>
    </div>
  );
}

/* ─── PII-safe helpers ───────────────────────────────────────── */
function stripPII(text: string): string {
  return text
    .replace(/\S+@\S+\.\S+/g, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/(?:linkedin|github|twitter)\.com\/\S*/gi, "")
    .replace(/(\+?\d[\d\s\-().]{6,}\d)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
function isPIILine(line: string): boolean {
  if (!line) return true;
  if (/\S+@\S+/.test(line)) return true;
  if (/https?:\/\//.test(line)) return true;
  if (/(?:linkedin|github|twitter)\.com/i.test(line)) return true;
  if (/^[\d\s\-+().]{7,}$/.test(line)) return true;
  return false;
}
function getResumeTitle(snippet: string, index: number): string {
  const lines = snippet.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (isPIILine(line)) continue;
    return line.length > 55 ? line.slice(0, 55) + "…" : line;
  }
  return `Resume #${index + 1}`;
}
function getCleanSnippet(snippet: string, title: string): string {
  const withoutTitle = snippet
    .split(/\r?\n/)
    .filter((l) => l.trim() !== title.replace(/…$/, "").trim())
    .join(" ");
  const clean = stripPII(withoutTitle).replace(/\s+/g, " ").trim();
  return clean.length > 150 ? clean.slice(0, 150) + "…" : clean;
}

/* ─── Relative time ──────────────────────────────────────────── */
function relativeTime(date: Date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/* ─── Skeletons ──────────────────────────────────────────────── */
function CardSkeleton() {
  return (
    <Card className="border-border/60">
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3.5 w-24" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-14 w-12 rounded-lg" />
            <Skeleton className="h-14 w-12 rounded-lg" />
            <Skeleton className="h-14 w-12 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-3/4" />
      </CardContent>
    </Card>
  );
}

/* ─── Empty state ────────────────────────────────────────────── */
function EmptyState({ hasSearch, onClear }: { hasSearch: boolean; onClear?: () => void }) {
  if (hasSearch) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4 py-20 text-center"
      >
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
          <Search className="h-7 w-7 text-muted-foreground/50" />
        </div>
        <div>
          <h3 className="font-semibold mb-1">No results found</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            No analyses match your search. Try a different name or role.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onClear}>
          Clear Search
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-6 py-24 text-center"
    >
      {/* Illustration */}
      <div className="relative">
        <div className="h-24 w-24 rounded-3xl bg-primary/10 flex items-center justify-center">
          <ScanEye className="h-12 w-12 text-primary/60" />
        </div>
        <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-xl bg-muted border-2 border-background flex items-center justify-center">
          <FileText className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">No analyses yet</h2>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          Upload your resume to get an AI-powered score, ATS compatibility check,
          and personalised improvement tips — all saved here automatically.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild className="gap-2">
          <Link href="/resume">
            Analyze My Resume <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/tips">Interview Tips</Link>
        </Button>
      </div>
    </motion.div>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */
export default function MyAnalyses() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  /* Compare selection */
  const [selected, setSelected] = useState<string[]>([]);

  /* Delete dialog */
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* Search & sort */
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  /* Fetch */
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    if (!isFirebaseConfigured) { setLoading(false); return; }
    setLoading(true);
    setFetchError(false);
    fetchResumeAnalysisHistory(user.uid, 50)
      .then(setAnalyses)
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [user]);

  /* Sort */
  const sorted = useMemo(() => {
    const arr = [...analyses];
    switch (sortKey) {
      case "oldest":
        arr.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case "highest-overall":
        arr.sort((a, b) => b.overallScore - a.overallScore);
        break;
      case "highest-ats":
        arr.sort((a, b) => (b.atsScore ?? 0) - (a.atsScore ?? 0));
        break;
      case "lowest-ats":
        arr.sort((a, b) => (a.atsScore ?? 0) - (b.atsScore ?? 0));
        break;
      default:
        break; /* newest — already fetched desc */
    }
    return arr;
  }, [analyses, sortKey]);

  /* Search filter */
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase();
    return sorted.filter((a) => {
      const firstLine = a.resumeSnippet
        .split(/\r?\n/)
        .map((l) => l.trim())
        .find((l) => l && !isPIILine(l)) ?? "";
      return (
        firstLine.toLowerCase().includes(q) ||
        a.targetRole.toLowerCase().includes(q) ||
        a.resumeSnippet.toLowerCase().includes(q)
      );
    });
  }, [sorted, searchQuery]);

  /* Compare */
  function toggleSelection(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  }
  function handleCompare() {
    if (selected.length === 2) {
      navigate(`/compare-resumes?a=${selected[0]}&b=${selected[1]}`);
    }
  }

  /* Delete */
  async function handleDelete() {
    if (!user || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteResumeAnalysis(user.uid, deleteTarget);
      setAnalyses((prev) => prev.filter((a) => a.id !== deleteTarget));
      setSelected((prev) => prev.filter((id) => id !== deleteTarget));
      toast({ title: "Analysis deleted", description: "The resume analysis has been removed." });
    } catch {
      toast({
        title: "Delete failed",
        description: "Couldn't delete the analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl pb-28">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">My Analyses</h1>
        </div>
        <p className="text-muted-foreground">
          Your saved resume analyses, sorted newest first.
          {analyses.length >= 2 && (
            <span className="ml-1 text-primary">Select two to compare.</span>
          )}
        </p>
      </motion.div>

      {/* Error banner */}
      {fetchError && (
        <div className="mb-6 flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Couldn't load your analyses. Check your connection and refresh.
        </div>
      )}

      {/* Firebase not configured */}
      {!isFirebaseConfigured && !loading && (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <Search className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">
            Analysis history requires Firebase — not configured in this environment.
          </p>
          <Button asChild variant="outline">
            <Link href="/resume">Analyze a Resume</Link>
          </Button>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {/* Loaded content */}
      {!loading && isFirebaseConfigured && (
        <>
          {/* ── Search + Sort bar ── */}
          {analyses.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col sm:flex-row gap-3 mb-6"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by resume name or target role…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                <SelectTrigger className="w-full sm:w-52 gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Sort by…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="highest-overall">Highest Overall Score</SelectItem>
                  <SelectItem value="highest-ats">Highest ATS Score</SelectItem>
                  <SelectItem value="lowest-ats">Lowest ATS Score</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>
          )}

          {/* Empty state */}
          {analyses.length === 0 && !fetchError && (
            <EmptyState hasSearch={false} />
          )}

          {/* No search results */}
          {analyses.length > 0 && filtered.length === 0 && (
            <EmptyState hasSearch onClear={() => setSearchQuery("")} />
          )}

          {/* Result count when filtered */}
          {searchQuery && filtered.length > 0 && (
            <p className="text-xs text-muted-foreground mb-4">
              {filtered.length} of {analyses.length} {analyses.length === 1 ? "analysis" : "analyses"} match
            </p>
          )}

          {/* Analysis cards */}
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {filtered.map((a, i) => {
                const keywordScore = a.result.keywordAnalysis?.length
                  ? Math.round(
                      (a.result.keywordAnalysis.filter((k) => k.found).length /
                        a.result.keywordAnalysis.length) *
                        100,
                    )
                  : 0;
                const title = getResumeTitle(a.resumeSnippet, i);
                const snippet = getCleanSnippet(a.resumeSnippet, title);
                const isSelected = selected.includes(a.id);
                const isDisabled = selected.length >= 2 && !isSelected;

                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, transition: { duration: 0.25 } }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                    layout
                  >
                    <Card
                      className={`border transition-all ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/20 shadow-md"
                          : "border-border/60 hover:border-primary/40 hover:shadow-md"
                      } ${isDisabled ? "opacity-50" : ""}`}
                    >
                      <CardContent className="pt-5 pb-5">
                        <div className="flex items-start justify-between gap-4">

                          {/* Left: clickable meta area */}
                          <button
                            className="flex-1 min-w-0 text-left space-y-2 cursor-pointer group"
                            onClick={() => navigate(`/my-analyses/${a.id}`)}
                          >
                            <h3 className="font-semibold text-base group-hover:text-primary transition-colors truncate">
                              {title}
                            </h3>

                            {a.targetRole && a.targetRole !== "General" && (
                              <div className="flex items-center gap-1 text-sm font-medium text-foreground/70">
                                <Target className="h-3.5 w-3.5 shrink-0" />
                                {a.targetRole}
                              </div>
                            )}

                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              {relativeTime(a.createdAt)}
                            </div>

                            <div className="flex flex-wrap gap-2 mt-1">
                              <Badge variant="outline" className={`text-xs font-medium ${scoreBadge(a.overallScore)}`}>
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Overall {a.overallScore}%
                              </Badge>
                              {a.atsScore != null && (
                                <Badge variant="outline" className={`text-xs font-medium ${scoreBadge(a.atsScore)}`}>
                                  <Zap className="h-3 w-3 mr-1" />
                                  ATS {a.atsScore}%
                                </Badge>
                              )}
                              <Badge variant="outline" className={`text-xs font-medium ${scoreBadge(keywordScore)}`}>
                                <Search className="h-3 w-3 mr-1" />
                                Keywords {keywordScore}%
                              </Badge>
                            </div>

                            {snippet && (
                              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-1">
                                {snippet}
                              </p>
                            )}
                          </button>

                          {/* Right: action buttons + score rings */}
                          <div className="flex flex-col items-end gap-3 shrink-0">
                            {/* Action buttons row */}
                            <div className="flex items-center gap-2">
                              {/* Delete button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget(a.id);
                                }}
                                title="Delete this analysis"
                                className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:border-destructive/60 hover:text-destructive hover:bg-destructive/5 transition-all"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>

                              {/* Compare button */}
                              <button
                                onClick={() => !isDisabled && toggleSelection(a.id)}
                                disabled={isDisabled}
                                title={isSelected ? "Deselect" : isDisabled ? "Already 2 selected" : "Select for comparison"}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all
                                  ${isSelected
                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                    : isDisabled
                                      ? "bg-muted text-muted-foreground border-border cursor-not-allowed"
                                      : "bg-background border-border hover:border-primary hover:text-primary"
                                  }`}
                              >
                                <GitCompare className="h-3.5 w-3.5" />
                                {isSelected ? "Selected" : "Compare"}
                              </button>
                            </div>

                            {/* Score rings */}
                            <div className="flex items-center gap-2">
                              <MiniRing score={a.overallScore} label="Overall" />
                              {a.atsScore != null && <MiniRing score={a.atsScore} label="ATS" />}
                              <MiniRing score={keywordScore} label="Keywords" />
                              <ChevronRight className="h-4 w-4 text-muted-foreground ml-1" />
                            </div>
                          </div>

                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Count footer */}
            {filtered.length > 0 && (
              <div className="pt-4 text-center text-sm text-muted-foreground">
                {analyses.length} {analyses.length === 1 ? "analysis" : "analyses"} saved
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Sticky compare bar ── */}
      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-lg"
          >
            <div className="flex items-center gap-3 bg-background border border-border shadow-xl rounded-2xl px-5 py-3">
              <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
                <GitCompare className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">
                  {selected.length === 1
                    ? <span><strong>1</strong> selected — pick one more</span>
                    : <span><strong>2</strong> selected — ready to compare</span>}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setSelected([])}>
                  <X className="h-3.5 w-3.5" /> Clear
                </Button>
                <Button size="sm" className="h-8 gap-1.5 text-xs" disabled={selected.length !== 2} onClick={handleCompare}>
                  <GitCompare className="h-3.5 w-3.5" /> Compare
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete confirmation dialog ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resume Analysis</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this resume analysis?
              <br />
              <strong>This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
