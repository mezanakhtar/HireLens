import { useState, useMemo, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetInterviewTips } from "@workspace/api-client-react";
import {
  Lightbulb, Code2, Users, MessageSquare, Network, Brain, GitBranch,
  Heart, Copy, Search, X, Clock, ChevronDown, ChevronUp, Star,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type Difficulty = "beginner" | "intermediate" | "advanced";

interface ApiTip {
  id: string;
  title: string;
  content: string;
  category: string;
}

interface TipMeta {
  difficulty: Difficulty;
  readingTime: string;
  featured?: boolean;
}

// ── Static metadata (difficulty + reading time per tip id) ───────────────────

const TIP_META: Record<string, TipMeta> = {
  t1: { difficulty: "beginner",     readingTime: "Quick Tip", featured: true },
  t2: { difficulty: "intermediate", readingTime: "1 min read" },
  t3: { difficulty: "intermediate", readingTime: "1 min read" },
  t4: { difficulty: "advanced",     readingTime: "2 min read" },
  t5: { difficulty: "beginner",     readingTime: "Quick Tip" },
  t6: { difficulty: "advanced",     readingTime: "2 min read" },
  t7: { difficulty: "intermediate", readingTime: "1 min read" },
  t8: { difficulty: "beginner",     readingTime: "Quick Tip" },
};

const DIFF_STYLE: Record<Difficulty, { label: string; dot: string; className: string }> = {
  beginner:     { label: "Beginner",     dot: "🟢", className: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800" },
  intermediate: { label: "Intermediate", dot: "🟡", className: "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800" },
  advanced:     { label: "Advanced",     dot: "🔴", className: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800" },
};

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: undefined,       label: "All Tips" },
  { id: "technical",    label: "Technical",    icon: <Code2 className="h-4 w-4" /> },
  { id: "hr",           label: "HR",           icon: <Users className="h-4 w-4" /> },
  { id: "behavioral",   label: "Behavioral",   icon: <MessageSquare className="h-4 w-4" /> },
  { id: "system-design",label: "System Design",icon: <Network className="h-4 w-4" /> },
  { id: "ml-ai",        label: "ML / AI",      icon: <Brain className="h-4 w-4" /> },
  { id: "dsa",          label: "DSA",          icon: <GitBranch className="h-4 w-4" /> },
] as const;

const FAVORITES_KEY = "hirelens_favorite_tips";
const FEATURED_ID   = "t1";
const READ_MORE_THRESHOLD = 120; // characters

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

async function copyTipToClipboard(tip: ApiTip) {
  const meta = TIP_META[tip.id];
  const text = [
    `Title: ${tip.title}`,
    `Description: ${tip.content}`,
    `Category: ${tip.category.replace(/-/g, " ")}`,
    meta ? `Difficulty: ${DIFF_STYLE[meta.difficulty].label}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  await navigator.clipboard.writeText(text);
}

// ── Tip card badges row (shared between featured & grid cards) ────────────────

function TipBadges({ tip }: { tip: ApiTip }) {
  const meta = TIP_META[tip.id];
  if (!meta) return null;
  const diff = DIFF_STYLE[meta.difficulty];
  return (
    <div className="flex items-center flex-wrap gap-2 mt-3">
      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize border border-border/40">
        {tip.category.replace(/-/g, " ")}
      </span>
      <span
        className={cn("text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1", diff.className)}
        aria-label={`Difficulty: ${diff.label}`}
      >
        <span aria-hidden="true">{diff.dot}</span>
        {diff.label}
      </span>
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3" aria-hidden="true" />
        {meta.readingTime}
      </span>
    </div>
  );
}

// ── Tip action row (Save + Copy) ──────────────────────────────────────────────

function TipActions({
  tip,
  isFavorite,
  pulse,
  onToggleFavorite,
}: {
  tip: ApiTip;
  isFavorite: boolean;
  pulse: boolean;
  onToggleFavorite: () => void;
}) {
  const handleCopy = useCallback(async () => {
    try {
      await copyTipToClipboard(tip);
      toast.success("Tip copied to clipboard.");
    } catch {
      toast.error("Failed to copy tip.");
    }
  }, [tip]);

  return (
    <div className="flex items-center gap-1.5 mt-3">
      <button
        onClick={onToggleFavorite}
        className={cn(
          "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          isFavorite
            ? "text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-400"
            : "text-muted-foreground border-border hover:border-rose-300 hover:text-rose-500"
        )}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? `Remove ${tip.title} from favorites` : `Save ${tip.title} to favorites`}
      >
        <motion.div
          animate={pulse ? { scale: [1, 1.4, 0.9, 1] } : {}}
          transition={{ duration: 0.35 }}
          aria-hidden="true"
        >
          <Heart className={cn("h-3.5 w-3.5 transition-all", isFavorite && "fill-current")} />
        </motion.div>
        {isFavorite ? "Saved" : "Save"}
      </button>

      <button
        onClick={handleCopy}
        className={cn(
          "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border",
          "text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        )}
        aria-label={`Copy ${tip.title} tip to clipboard`}
      >
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        Copy
      </button>
    </div>
  );
}

// ── Individual grid tip card ──────────────────────────────────────────────────

const TipCard = memo(function TipCard({
  tip,
  index,
  isFavorite,
  onToggleFavorite,
}: {
  tip: ApiTip;
  index: number;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [pulse, setPulse]       = useState(false);

  const showReadMore = tip.content.length > READ_MORE_THRESHOLD;

  // Trigger heart pulse when tip is saved
  useEffect(() => {
    if (isFavorite) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 400);
      return () => clearTimeout(t);
    }
  }, [isFavorite]);

  const handleToggle = useCallback(() => onToggleFavorite(tip.id), [tip.id, onToggleFavorite]);

  return (
    <motion.div
      custom={index}
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.3 } }),
      }}
      initial="hidden"
      animate="show"
    >
      <Card className="h-full border-border/60 hover:border-primary/40 hover:shadow-sm transition-all">
        <CardContent className="pt-5 pb-5">
          <div className="flex gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
              <Lightbulb className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-2 leading-snug">{tip.title}</h3>

              {/* Content with expand/collapse */}
              <div>
                <p className={cn("text-sm text-muted-foreground leading-relaxed", !expanded && showReadMore && "line-clamp-3")}>
                  {tip.content}
                </p>
                {showReadMore && (
                  <button
                    onClick={() => setExpanded((v) => !v)}
                    className={cn(
                      "mt-1.5 flex items-center gap-0.5 text-xs text-primary hover:underline",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                    )}
                    aria-expanded={expanded}
                    aria-label={expanded ? "Show less content" : "Read more content"}
                  >
                    {expanded ? (
                      <><ChevronUp className="h-3 w-3" aria-hidden="true" /> Show Less</>
                    ) : (
                      <>Read More <ChevronDown className="h-3 w-3" aria-hidden="true" /></>
                    )}
                  </button>
                )}
              </div>

              <TipBadges tip={tip} />
              <TipActions tip={tip} isFavorite={isFavorite} pulse={pulse} onToggleFavorite={handleToggle} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

// ── Featured (recommended) tip card ──────────────────────────────────────────

function FeaturedTipCard({
  tip,
  isFavorite,
  onToggleFavorite,
}: {
  tip: ApiTip;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (isFavorite) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 400);
      return () => clearTimeout(t);
    }
  }, [isFavorite]);

  const handleToggle = useCallback(() => onToggleFavorite(tip.id), [tip.id, onToggleFavorite]);

  return (
    <motion.div
      key="featured"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
    >
      {/* Gradient border wrapper */}
      <div
        className="rounded-xl p-[2px] bg-gradient-to-r from-primary/70 via-primary/30 to-violet-400/50"
        role="region"
        aria-label="Recommended tip"
      >
        <Card className="rounded-[10px] border-0">
          <CardContent className="pt-5 pb-5">
            {/* Featured label */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-3" aria-hidden="true">
              <Star className="h-3.5 w-3.5 fill-current" />
              Recommended for You
            </div>

            <div className="flex gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <Lightbulb className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-2 leading-snug">{tip.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{tip.content}</p>
                <TipBadges tip={tip} />
                <TipActions tip={tip} isFavorite={isFavorite} pulse={pulse} onToggleFavorite={handleToggle} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

// ── Loading skeletons ─────────────────────────────────────────────────────────

function TipSkeletons() {
  return (
    <div className="mt-8 grid sm:grid-cols-2 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-44 rounded-xl overflow-hidden">
          <Skeleton className="h-full w-full" />
        </div>
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-16 text-center py-8"
      role="status"
      aria-live="polite"
    >
      <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
        <Search className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-semibold mb-2">No tips found</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
        Try another keyword or category.
      </p>
      <Button variant="outline" onClick={onClear} className="gap-2">
        <X className="h-4 w-4" aria-hidden="true" />
        Clear Search
      </Button>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Tips() {
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);
  const [search, setSearch]                 = useState("");
  const [favorites, setFavorites]           = useState<Set<string>>(loadFavorites);

  // Fetch all tips once; do all filtering client-side
  const { data: allTips = [], isLoading } = useGetInterviewTips(
    {},
    { query: { queryKey: ["interview-tips-all"] } }
  );

  // Persist favorites to localStorage
  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  }, [favorites]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const clearSearch = useCallback(() => setSearch(""), []);

  // Client-side filtering: category + search query
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allTips.filter((tip) => {
      if (activeCategory && tip.category !== activeCategory) return false;
      if (!q) return true;
      return (
        tip.title.toLowerCase().includes(q) ||
        tip.content.toLowerCase().includes(q) ||
        tip.category.toLowerCase().includes(q)
      );
    });
  }, [allTips, activeCategory, search]);

  // Separate featured tip from the main grid
  const featuredTip = useMemo(() => filtered.find((t) => t.id === FEATURED_ID) ?? null, [filtered]);
  const gridTips    = useMemo(() => filtered.filter((t) => t.id !== FEATURED_ID), [filtered]);

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-3xl font-bold">Interview Tips</h1>
        <p className="text-muted-foreground mt-1">Curated tips from hiring managers and industry experts.</p>
      </motion.div>

      {/* Search bar */}
      <div className="mt-8 relative" role="search">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Search interview tips..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-9"
          aria-label="Search interview tips"
          aria-controls="tips-results"
        />
        <AnimatePresence>
          {search && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={clearSearch}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              )}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Category filter tabs */}
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        {CATEGORIES.map((cat) => (
          <button
            key={String(cat.id)}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              activeCategory === cat.id
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground bg-background"
            )}
            aria-pressed={activeCategory === cat.id}
            data-testid={`tab-${String(cat.id ?? "all")}`}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div id="tips-results" aria-live="polite" aria-atomic="false">
        {isLoading ? (
          <TipSkeletons />
        ) : filtered.length === 0 ? (
          <EmptyState onClear={clearSearch} />
        ) : (
          <div className="mt-8 space-y-6">

            {/* Recommended tip */}
            <AnimatePresence mode="popLayout">
              {featuredTip && (
                <FeaturedTipCard
                  key="featured"
                  tip={featuredTip}
                  isFavorite={favorites.has(featuredTip.id)}
                  onToggleFavorite={toggleFavorite}
                />
              )}
            </AnimatePresence>

            {/* Main grid */}
            {gridTips.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-5">
                {gridTips.map((tip, i) => (
                  <TipCard
                    key={tip.id}
                    tip={tip}
                    index={i}
                    isFavorite={favorites.has(tip.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            )}

          </div>
        )}
      </div>

    </div>
  );
}
