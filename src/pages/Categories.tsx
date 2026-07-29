import { useMemo } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetInterviewCategories } from "@workspace/api-client-react";
import {
  BrainCircuit, Code2, Users, MessageSquare,
  Network, Brain, GitBranch, ArrowRight,
} from "lucide-react";

// ── Icon map ───────────────────────────────────────────────────────────────
const iconMap: Record<string, React.ReactNode> = {
  Code2:         <Code2         className="h-7 w-7" />,
  Users:         <Users         className="h-7 w-7" />,
  MessageSquare: <MessageSquare className="h-7 w-7" />,
  Network:       <Network       className="h-7 w-7" />,
  Brain:         <Brain         className="h-7 w-7" />,
  GitBranch:     <GitBranch     className="h-7 w-7" />,
};

// ── Static metadata ─────────────────────────────────────────────────────────

// Per-category topic counts (static)
const TOPIC_COUNTS: Record<string, number> = {
  technical:       18,
  hr:              12,
  behavioral:      14,
  "system-design": 15,
  "ml-ai":         16,
  dsa:             20,
};

// Per-difficulty metadata shown on interactive rows
const LEVEL_ROWS = [
  {
    level:    "beginner",
    label:    "Beginner",
    dot:      "bg-green-500",
    text:     "text-green-600 dark:text-green-400",
    hover:    "hover:bg-green-50 dark:hover:bg-green-950/30 focus-visible:bg-green-50 dark:focus-visible:bg-green-950/30",
    questions: "50+",
    duration:  "≈15 min",
  },
  {
    level:    "intermediate",
    label:    "Intermediate",
    dot:      "bg-yellow-500",
    text:     "text-yellow-600 dark:text-yellow-400",
    hover:    "hover:bg-yellow-50 dark:hover:bg-yellow-950/30 focus-visible:bg-yellow-50 dark:focus-visible:bg-yellow-950/30",
    questions: "60+",
    duration:  "≈20 min",
  },
  {
    level:    "advanced",
    label:    "Advanced",
    dot:      "bg-red-500",
    text:     "text-red-600 dark:text-red-400",
    hover:    "hover:bg-red-50 dark:hover:bg-red-950/30 focus-visible:bg-red-50 dark:focus-visible:bg-red-950/30",
    questions: "40+",
    duration:  "≈30 min",
  },
] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.35 } }),
};

// ── Component ───────────────────────────────────────────────────────────────

export default function Categories() {
  const { data: categories, isLoading } = useGetInterviewCategories();

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-3xl font-bold">Interview Categories</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Choose a category and difficulty. Every category includes Beginner, Intermediate, and Advanced levels —
          AI generates questions tailored exactly to your chosen level.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 rounded-xl overflow-hidden">
                <Skeleton className="h-full w-full" />
              </div>
            ))
          : categories?.map((cat, i) => {
              const topicCount = TOPIC_COUNTS[cat.id] ?? 15;
              return (
                <motion.div key={cat.id} custom={i} variants={fadeUp} initial="hidden" animate="show">
                  <Card className="h-full border-border/60 hover:border-primary/40 hover:shadow-md transition-all">
                    <CardContent className="pt-6 pb-5 flex flex-col h-full">

                      {/* Top area: icon + name + description → full difficulty select (no preset) */}
                      <Link
                        href={`/practice/${cat.id}/difficulty`}
                        className="block group/top mb-4 outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
                      >
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover/top:bg-primary group-hover/top:text-primary-foreground transition-all duration-200 mb-4">
                          {iconMap[cat.icon] ?? <BrainCircuit className="h-7 w-7" />}
                        </div>
                        <h3 className="font-semibold text-base mb-1 group-hover/top:text-primary transition-colors">
                          {cat.name}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                          {cat.description}
                        </p>
                      </Link>

                      {/* Interactive difficulty rows */}
                      <div className="border-t border-border/50 pt-3 space-y-0.5 flex-1">
                        {LEVEL_ROWS.map((lv) => (
                          <Link
                            key={lv.level}
                            href={`/practice/${cat.id}/difficulty?preset=${lv.level}`}
                            className={`flex items-center justify-between gap-2 px-2 py-2 rounded-lg transition-colors cursor-pointer group/row outline-none focus-visible:ring-2 focus-visible:ring-primary ${lv.hover}`}
                            aria-label={`Practice ${cat.name} at ${lv.label} level — ${lv.questions} questions, ${lv.duration}`}
                          >
                            {/* Level label */}
                            <span className="flex items-center gap-1.5 min-w-0">
                              <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${lv.dot}`} />
                              <span className={`text-xs font-semibold ${lv.text}`}>{lv.label}</span>
                            </span>
                            {/* Meta */}
                            <span className="flex items-center gap-2 text-[11px] text-muted-foreground shrink-0">
                              <span>{lv.questions} Q</span>
                              <span className="opacity-50">·</span>
                              <span>{lv.duration}</span>
                              <ArrowRight className="h-3 w-3 text-primary opacity-0 group-hover/row:opacity-100 transition-opacity" aria-hidden="true" />
                            </span>
                          </Link>
                        ))}
                      </div>

                      {/* Footer: richer stats */}
                      <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                        <span>{cat.questionCount}+ Questions</span>
                        <span className="opacity-40">·</span>
                        <span>3 Difficulty Levels</span>
                        <span className="opacity-40">·</span>
                        <span>{topicCount}+ Topics</span>
                      </div>

                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
      </div>
    </div>
  );
}
