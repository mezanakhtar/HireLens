import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useGetInterviewCategories } from "@workspace/api-client-react";
import {
  ArrowRight, BrainCircuit, Code2, Users, MessageSquare,
  Network, Brain, GitBranch, CheckCircle2, Zap, Shield, TrendingUp,
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  Code2: <Code2 className="h-6 w-6" />,
  Users: <Users className="h-6 w-6" />,
  MessageSquare: <MessageSquare className="h-6 w-6" />,
  Network: <Network className="h-6 w-6" />,
  Brain: <Brain className="h-6 w-6" />,
  GitBranch: <GitBranch className="h-6 w-6" />,
};

const difficultyColor: Record<string, string> = {
  beginner: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  intermediate: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  advanced: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const stats = [
  { value: "10,000+", label: "Questions Generated" },
  { value: "5,000+", label: "Mock Interviews" },
  { value: "92%", label: "User Satisfaction" },
  { value: "6", label: "Interview Categories" },
];

const features = [
  {
    icon: <Zap className="h-5 w-5 text-primary" />,
    title: "AI-Powered Questions",
    desc: "Get personalized interview questions tailored to your role, stack, and experience level.",
  },
  {
    icon: <MessageSquare className="h-5 w-5 text-primary" />,
    title: "Live Mock Interviews",
    desc: "Practice with an AI interviewer that asks follow-ups, evaluates answers, and gives feedback.",
  },
  {
    icon: <Shield className="h-5 w-5 text-primary" />,
    title: "Resume Analysis",
    desc: "Get your resume scored for ATS compatibility and receive specific improvement suggestions.",
  },
  {
    icon: <TrendingUp className="h-5 w-5 text-primary" />,
    title: "Progress Tracking",
    desc: "Monitor your scores across sessions and identify where to focus your preparation.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

export default function Home() {
  const { data: categories, isLoading } = useGetInterviewCategories();

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl -z-10" />
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge className="mb-6 px-4 py-1.5 text-sm font-medium" variant="secondary">
              AI-Powered Resume &amp; Interview Platform
            </Badge>
          </motion.div>
          <motion.h1
            className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Ace Every Interview with{" "}
            <span className="text-primary">AI-Powered</span> Preparation
          </motion.h1>
          <motion.p
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Practice with realistic AI mock interviews, get your resume scored, and build the confidence
            to land your dream role — whether you're a fresher, student, or career switcher.
          </motion.p>
          <motion.div
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Button size="lg" asChild className="gap-2 px-8">
              <Link href="/login">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/categories">Browse Categories</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/60 py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                className="text-center"
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
              >
                <div className="text-3xl font-bold text-primary">{s.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight">Everything You Need to Prepare</h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            A complete toolkit for interview preparation, from question generation to real-time AI coaching.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              <Card className="h-full border-border/60 hover:border-primary/40 transition-colors">
                <CardContent className="pt-6 space-y-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    {f.icon}
                  </div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-muted/20 border-t border-border/60">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight">Interview Categories</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Practice across every interview format — from DSA to HR to system design.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
                ))
              : categories?.map((cat, i) => (
                  <motion.div
                    key={cat.id}
                    custom={i}
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true }}
                  >
                    <Link href={`/practice/${cat.id}`}>
                      <Card className="group h-full border-border/60 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              {iconMap[cat.icon] ?? <BrainCircuit className="h-6 w-6" />}
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${cat.difficulty ? difficultyColor[cat.difficulty] ?? "" : ""}`}>
                              {cat.difficulty}
                            </span>
                          </div>
                          <h3 className="font-semibold mb-1">{cat.name}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{cat.description}</p>
                          <div className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {cat.questionCount}+ questions
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
          </div>
          <div className="mt-10 text-center">
            <Button variant="outline" asChild>
              <Link href="/categories">View All Categories <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl bg-primary px-8 py-16 max-w-3xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-primary-foreground">Ready to Ace Your Next Interview?</h2>
          <p className="mt-4 text-primary-foreground/80 max-w-lg mx-auto">
            Start your AI-powered interview preparation today. No credit card required.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="mt-8 gap-2"
            asChild
          >
            <Link href="/login">
              Start Preparing Now <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </section>
    </div>
  );
}
