import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { ScanEye, Zap, Shield, Target, Users, Code2 } from "lucide-react";

const values = [
  { icon: <Target className="h-5 w-5 text-primary" />, title: "Mission-Driven", desc: "We exist to give every candidate — regardless of background — the tools and confidence to perform at their best." },
  { icon: <Zap className="h-5 w-5 text-primary" />, title: "AI-First", desc: "We use state-of-the-art LLMs to generate realistic, role-specific interview content that mirrors real hiring processes." },
  { icon: <Shield className="h-5 w-5 text-primary" />, title: "Privacy First", desc: "Your resume and interview data are never sold or shared. Your preparation is your own." },
  { icon: <Users className="h-5 w-5 text-primary" />, title: "Built for Everyone", desc: "From freshers to senior engineers, from HR to ML/AI roles — our platform adapts to your level and target." },
];

const stack = ["React", "TypeScript", "Vite", "Tailwind CSS", "Firebase Auth", "OpenAI GPT", "Node.js", "Express"];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.35 } }),
};

export default function About() {
  return (
    <div className="container mx-auto px-4 py-14 max-w-4xl">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-6">
          <ScanEye className="h-9 w-9" />
        </div>
        <h1 className="text-4xl font-bold mb-4">About HireLens</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          HireLens is an AI-powered interview preparation platform built for students, freshers, and job seekers
          who want to walk into every interview feeling fully prepared — not just hoping for the best.
        </p>
      </motion.div>

      {/* Mission */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <Card className="mb-10 border-border/60 bg-primary/5">
          <CardContent className="pt-8 pb-8 text-center">
            <h2 className="text-xl font-semibold mb-3">Our Vision</h2>
            <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Interview preparation shouldn't be a privilege. Most candidates study alone, guess what will be asked,
              and get little to no feedback. HireLens changes that by putting a knowledgeable AI interviewer in your corner
              — available 24/7, never judgmental, always specific.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Values */}
      <h2 className="text-2xl font-bold mb-6">What We Stand For</h2>
      <div className="grid sm:grid-cols-2 gap-5 mb-14">
        {values.map((v, i) => (
          <motion.div key={v.title} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <Card className="h-full border-border/60">
              <CardContent className="pt-5 space-y-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">{v.icon}</div>
                <h3 className="font-semibold">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tech Stack */}
      <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <Card className="border-border/60">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Code2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Built With</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {stack.map((tech) => (
                <span key={tech} className="px-3 py-1.5 rounded-full text-sm bg-muted text-muted-foreground border border-border/60">
                  {tech}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
