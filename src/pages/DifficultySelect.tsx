import { useState, useEffect, useMemo, memo } from "react";
import { useParams, useLocation, useSearch, Link } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BrainCircuit, Code2, Users, MessageSquare,
  Network, Brain, GitBranch, ChevronLeft,
  CheckCircle2, Clock, BookOpen, Award,
} from "lucide-react";
import { useGetInterviewCategories } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/useAuth";
import { fetchInterviewHistory } from "@/lib/firestore";
import { isFirebaseConfigured } from "@/lib/firebase";

// ── Icon map ───────────────────────────────────────────────────────────────
const iconMap: Record<string, React.ReactNode> = {
  Code2:         <Code2         className="h-6 w-6" />,
  Users:         <Users         className="h-6 w-6" />,
  MessageSquare: <MessageSquare className="h-6 w-6" />,
  Network:       <Network       className="h-6 w-6" />,
  Brain:         <Brain         className="h-6 w-6" />,
  GitBranch:     <GitBranch     className="h-6 w-6" />,
};

// ── Types ──────────────────────────────────────────────────────────────────
type DifficultyLevel = "beginner" | "intermediate" | "advanced";

interface DifficultyOption {
  level:           DifficultyLevel;
  label:           string;
  cardBorder:      string;
  cardBorderPreset:string;
  badgeClass:      string;
  dotClass:        string;
  checkClass:      string;
  description:     string;
  bullets:         string[];
  questions:       string;
  duration:        string;
  experience:      string;
  popular?:        boolean;
}

const DIFFICULTIES: DifficultyOption[] = [
  {
    level:            "beginner",
    label:            "Beginner",
    cardBorder:       "border-green-500/30 hover:border-green-500/70",
    cardBorderPreset: "border-green-500 ring-2 ring-green-500/25 shadow-md",
    badgeClass:       "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    dotClass:         "bg-green-500",
    checkClass:       "text-green-500",
    description:      "Perfect for freshers and those just starting their interview journey.",
    bullets:          [
      "Basic concepts & fundamentals",
      "Easier interview questions",
      "Recommended for freshers",
    ],
    questions:  "20 Questions",
    duration:   "≈15 Minutes",
    experience: "Recommended if you are starting interview preparation.",
  },
  {
    level:            "intermediate",
    label:            "Intermediate",
    cardBorder:       "border-yellow-500/50 hover:border-yellow-500 shadow-sm ring-1 ring-yellow-500/10",
    cardBorderPreset: "border-yellow-500 ring-2 ring-yellow-500/30 shadow-lg",
    badgeClass:       "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    dotClass:         "bg-yellow-500",
    checkClass:       "text-yellow-500",
    description:      "Real company interview style for candidates with some experience.",
    bullets:          [
      "Practical interview questions",
      "Moderate difficulty",
      "Real company interview style",
    ],
    questions:  "25 Questions",
    duration:   "≈20 Minutes",
    experience: "Recommended for real company interviews.",
    popular:    true,
  },
  {
    level:            "advanced",
    label:            "Advanced",
    cardBorder:       "border-red-500/30 hover:border-red-500/70",
    cardBorderPreset: "border-red-500 ring-2 ring-red-500/25 shadow-md",
    badgeClass:       "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    dotClass:         "bg-red-500",
    checkClass:       "text-red-500",
    description:      "Senior-level preparation with scenario-based deep technical discussions.",
    bullets:          [
      "Senior-level questions",
      "Scenario-based problems",
      "Deep technical discussions",
    ],
    questions:  "30 Questions",
    duration:   "≈30 Minutes",
    experience: "Recommended for experienced candidates.",
  },
];

// ── Animation ───────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show:   (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.36 },
  }),
};

// ── Difficulty card ─────────────────────────────────────────────────────────
const DifficultyCard = memo(function DifficultyCard({
  d,
  index,
  isPreset,
  isCompleted,
  onStart,
}: {
  d: DifficultyOption;
  index: number;
  isPreset: boolean;
  isCompleted: boolean;
  onStart: (level: DifficultyLevel) => void;
}) {
  const borderClass = isPreset ? d.cardBorderPreset : d.cardBorder;

  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="show"
    >
      <Card
        className={`group h-full border-2 transition-all duration-200 cursor-pointer ${borderClass}`}
        onClick={() => onStart(d.level)}
        role="button"
        tabIndex={0}
        aria-label={`Select ${d.label} difficulty — ${d.questions}, ${d.duration}`}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onStart(d.level); } }}
      >
        <CardContent className="pt-6 pb-6 flex flex-col h-full">

          {/* Top row: badge + tags */}
          <div className="flex items-start justify-between gap-2 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="secondary"
                className={`text-xs font-medium capitalize gap-1.5 ${d.badgeClass}`}
              >
                <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${d.dotClass}`} />
                {d.label}
              </Badge>
              {isCompleted && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  Completed
                </span>
              )}
            </div>
            {d.popular && !isPreset && (
              <span className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground border border-border/60 rounded-full px-2 py-0.5 shrink-0">
                Popular
              </span>
            )}
            {isPreset && (
              <span className="text-[10px] font-semibold tracking-wide uppercase text-primary border border-primary/40 rounded-full px-2 py-0.5 shrink-0 bg-primary/5">
                Selected
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {d.description}
          </p>

          {/* Bullets */}
          <ul className="space-y-2 flex-1 mb-5" aria-label={`${d.label} level features`}>
            {d.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm">
                <CheckCircle2
                  className={`h-4 w-4 mt-0.5 shrink-0 ${d.checkClass}`}
                  aria-hidden="true"
                />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-5">
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              {d.questions}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {d.duration}
            </span>
          </div>

          {/* Experience recommendation */}
          <p className="text-xs text-muted-foreground italic mb-5 border-l-2 border-border pl-3">
            {d.experience}
          </p>

          {/* CTA */}
          <Button
            variant={d.popular || isPreset ? "default" : "outline"}
            className="w-full"
            onClick={(e) => { e.stopPropagation(); onStart(d.level); }}
            aria-label={`Start ${d.label} practice`}
          >
            Start Practice
          </Button>

        </CardContent>
      </Card>
    </motion.div>
  );
});

// ── Main page ────────────────────────────────────────────────────────────────
export default function DifficultySelect() {
  const { categoryId }   = useParams<{ categoryId: string }>();
  const search           = useSearch();
  const [, navigate]     = useLocation();
  const { user }         = useAuth();

  const preset = useMemo(() => {
    const p = new URLSearchParams(search).get("preset") as DifficultyLevel | null;
    return p === "beginner" || p === "intermediate" || p === "advanced" ? p : null;
  }, [search]);

  // Fetch categories for the breadcrumb
  const { data: categories } = useGetInterviewCategories();
  const category = categories?.find((c) => c.id === categoryId);

  // Completion indicators from Firestore
  const [completedLevels, setCompletedLevels] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !isFirebaseConfigured) return;
    fetchInterviewHistory(user.uid, 100)
      .then((records) => {
        const done = new Set(
          records
            .filter((r) => r.category === categoryId)
            .map((r) => r.difficulty),
        );
        setCompletedLevels(done);
      })
      .catch(() => {/* silent — completion indicators are non-critical */});
  }, [user, categoryId]);

  const handleStart = (level: DifficultyLevel) => {
    navigate(`/practice/${categoryId}?difficulty=${level}`);
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">

      {/* Back link */}
      <Link
        href="/categories"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group outline-none focus-visible:underline"
      >
        <ChevronLeft
          className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform"
          aria-hidden="true"
        />
        Back to Categories
      </Link>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-10"
      >
        {category && (
          <div className="flex items-center gap-3 mb-5">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              {iconMap[category.icon] ?? <BrainCircuit className="h-6 w-6" />}
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">
                Category
              </p>
              <p className="text-sm font-semibold">{category.name}</p>
            </div>
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Choose Your Level</h1>
            <p className="text-muted-foreground mt-2 max-w-lg">
              {preset
                ? `You selected ${preset.charAt(0).toUpperCase() + preset.slice(1)} — confirm below or pick a different level.`
                : "Select the difficulty that matches your current preparation level."}
            </p>
          </div>
          {completedLevels.size > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 bg-muted/50 rounded-full px-3 py-1.5 border border-border/50">
              <Award className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {completedLevels.size} level{completedLevels.size > 1 ? "s" : ""} completed
            </div>
          )}
        </div>
      </motion.div>

      {/* Difficulty cards */}
      <div
        className="grid sm:grid-cols-3 gap-5"
        role="group"
        aria-label="Difficulty levels"
      >
        {DIFFICULTIES.map((d, i) => (
          <DifficultyCard
            key={d.level}
            d={d}
            index={i}
            isPreset={preset === d.level}
            isCompleted={completedLevels.has(d.level)}
            onStart={handleStart}
          />
        ))}
      </div>

    </div>
  );
}
