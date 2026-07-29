import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUploadZone } from "@/components/FileUploadZone";
import type { ExtractedFile } from "@/lib/resume-extractor";
import { useAnalyzeResume } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/useAuth";
import { saveResumeAnalysis } from "@/lib/firestore";
import { isFirebaseConfigured } from "@/lib/firebase";
import type {
  ResumeAnalysisResult,
  KeywordAnalysisItem,
  SkillScore,
  SectionScore,
  RoadmapPhase,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell,
} from "recharts";
import {
  FileText, Sparkles, Download, CheckCircle2, AlertCircle,
  Lightbulb, Tag, Target, Map, TrendingUp, Zap,
  ChevronRight, CheckCheck, XCircle, Circle,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/* ─── Color Helpers ───────────────────────────────────────── */
function scoreColor(s: number): string {
  if (s >= 80) return "#16a34a";
  if (s >= 60) return "#d97706";
  return "#dc2626";
}
function scoreBg(s: number): string {
  if (s >= 80) return "text-green-600 dark:text-green-400";
  if (s >= 60) return "text-yellow-500 dark:text-yellow-400";
  return "text-red-500 dark:text-red-400";
}
function priorityStyle(p: string) {
  if (p === "high") return "border-red-400/60 bg-red-50 dark:bg-red-950/20";
  if (p === "medium") return "border-yellow-400/60 bg-yellow-50 dark:bg-yellow-950/20";
  return "border-blue-400/60 bg-blue-50 dark:bg-blue-950/20";
}
function priorityBadge(p: string) {
  if (p === "high") return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  if (p === "medium") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400";
  return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400";
}

/* ─── Animated Score Ring (screen) ───────────────────────── */
function ScoreRing({ score, label, sublabel, color, size = 120 }: {
  score: number; label: string; sublabel?: string; color: string; size?: number;
}) {
  const r = size * 0.38;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const cx = size / 2;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="currentColor"
            strokeWidth={size * 0.07} className="text-muted/30" />
          <motion.circle
            cx={cx} cy={cx} r={r} fill="none" stroke={color}
            strokeWidth={size * 0.07} strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span className="font-bold leading-none"
            style={{ fontSize: size * 0.22, color }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            {score}
          </motion.span>
          <span className="text-muted-foreground" style={{ fontSize: size * 0.09 }}>/ 100</span>
        </div>
      </div>
      <div className="text-center">
        <div className="font-semibold text-sm">{label}</div>
        {sublabel && <div className="text-xs text-muted-foreground">{sublabel}</div>}
      </div>
    </div>
  );
}

/* ─── Keyword Badge (screen) ──────────────────────────────── */
function KeywordBadge({ item }: { item: KeywordAnalysisItem }) {
  const importanceRing =
    item.importance === "high" ? "ring-red-400/50" :
    item.importance === "medium" ? "ring-yellow-400/50" : "ring-blue-400/50";
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ring-1 ${importanceRing}
      ${item.found ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800/40"
        : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/40"}`}>
      {item.found
        ? <CheckCheck className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
        : <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
      <span className={`font-medium ${item.found ? "text-green-700 dark:text-green-300" : "text-red-600 dark:text-red-400"}`}>
        {item.keyword}
      </span>
      <span className={`text-xs px-1.5 py-0.5 rounded capitalize font-medium ml-auto
        ${item.importance === "high" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
          item.importance === "medium" ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" :
          "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"}`}>
        {item.importance}
      </span>
      {item.found && item.frequency != null && item.frequency > 0 && (
        <span className="text-xs text-muted-foreground">×{item.frequency}</span>
      )}
    </div>
  );
}

/* ─── Custom Chart Tooltip ────────────────────────────────── */
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-md text-sm">
      <div className="font-medium">{label}</div>
      <div className={`font-bold ${scoreBg(payload[0].value)}`}>{payload[0].value}%</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PDF PRINT LAYOUT — off-screen, hardcoded light theme
   Renders all content as one flat column; no CSS variables.
   ═══════════════════════════════════════════════════════════ */
const PDF_WIDTH = 820;

/* Static score ring for PDF (plain SVG, no animation) */
function PdfRing({ score, label, color }: { score: number; label: string; color: string }) {
  const size = 100;
  const r = size * 0.38;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const filled = circumference - (score / 100) * circumference;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="#e2e8f0" strokeWidth={size * 0.07} />
          <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={size * 0.07}
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={filled} />
        </svg>
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontWeight: 700, fontSize: 22, color, lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 9, color: "#94a3b8" }}>/100</span>
        </div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#1e293b", textAlign: "center" }}>{label}</span>
    </div>
  );
}

/* Inline bar (replaces Recharts for PDF) */
function PdfBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3, color: "#334155" }}>
        <span>{label}</span><span style={{ fontWeight: 700, color }}>{value}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: "#e2e8f0", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, borderRadius: 4, background: color }} />
      </div>
    </div>
  );
}

function PdfSection({ title, children, sectionId }: { title: string; children: React.ReactNode; sectionId?: string }) {
  return (
    <div
      style={{ marginBottom: 24 }}
      {...(sectionId ? { "data-pdf-section": sectionId } : {})}
    >
      <div style={{
        fontSize: 13, fontWeight: 700, color: "#1e40af", borderBottom: "2px solid #dbeafe",
        paddingBottom: 6, marginBottom: 12,
      }}>{title}</div>
      {children}
    </div>
  );
}

function PdfReportLayout({ result, targetRole, date }: {
  result: ResumeAnalysisResult;
  targetRole: string;
  date: string;
}) {
  const foundKeywords = result.keywordAnalysis?.filter((k) => k.found) ?? [];
  const missingKeywords = result.keywordAnalysis?.filter((k) => !k.found) ?? [];
  const keywordScore = result.keywordAnalysis?.length
    ? Math.round((foundKeywords.length / result.keywordAnalysis.length) * 100) : 0;

  const root: React.CSSProperties = {
    width: PDF_WIDTH,
    background: "#ffffff",
    fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
    color: "#1e293b",
    padding: "60px 40px",
    boxSizing: "border-box",
  };

  const card: React.CSSProperties = {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "16px 20px",
    marginBottom: 16,
  };

  return (
    <div style={root}>
      {/* ── Header ── */}
      <div data-pdf-section="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#1e40af", letterSpacing: "-0.5px", lineHeight: 1.1 }}>
            HireLens
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#64748b", marginTop: 4, letterSpacing: "0.01em" }}>
            Resume Analysis Report
          </div>
          {targetRole && (
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 10 }}>Target Role: <strong style={{ color: "#1e293b" }}>{targetRole}</strong></div>
          )}
        </div>
        <div style={{ textAlign: "right", lineHeight: 1.65 }}>
          <div style={{ fontSize: 9, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.08em" }}>Generated</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>{date}</div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>hirelens.app</div>
        </div>
      </div>

      {/* ── Score Rings ── */}
      <div data-pdf-section="scores" style={{ ...card, display: "flex", gap: 32, justifyContent: "center", alignItems: "flex-start", flexWrap: "wrap" }}>
        <PdfRing score={result.overallScore} label="Overall Score" color={scoreColor(result.overallScore)} />
        {result.atsScore != null && (
          <PdfRing score={result.atsScore} label="ATS Score" color={scoreColor(result.atsScore)} />
        )}
        <PdfRing score={keywordScore} label="Keyword Match" color={scoreColor(keywordScore)} />
      </div>

      {/* Summary */}
      <div data-pdf-section="summary" style={{ ...card, background: "#eff6ff", borderColor: "#bfdbfe", marginBottom: 24, padding: "20px 24px" }}>
        <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.85 }}>{result.summary}</div>
      </div>

      {/* ── Section Scores ── */}
      {result.sectionScores.length > 0 && (
        <PdfSection title="Section Scores" sectionId="section-scores">
          {result.sectionScores.map((s: SectionScore) => (
            <div key={s.section} style={{ marginBottom: 10 }}>
              <PdfBar label={s.section} value={s.score} color={scoreColor(s.score)} />
              {s.feedback && (
                <div style={{ fontSize: 10, color: "#64748b", marginTop: 2, paddingLeft: 4 }}>{s.feedback}</div>
              )}
            </div>
          ))}
        </PdfSection>
      )}

      {/* ── Strengths & Weaknesses ── */}
      <div data-pdf-section="strengths" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <PdfSection title="✓  Strengths">
          {result.strengths.map((s: string) => (
            <div key={s} style={{ display: "flex", gap: 6, marginBottom: 6, fontSize: 11, color: "#15803d" }}>
              <span style={{ flexShrink: 0 }}>•</span><span style={{ color: "#334155" }}>{s}</span>
            </div>
          ))}
        </PdfSection>
        <PdfSection title="!  Areas to Improve">
          {result.weaknesses.map((w: string) => (
            <div key={w} style={{ display: "flex", gap: 6, marginBottom: 6, fontSize: 11, color: "#dc2626" }}>
              <span style={{ flexShrink: 0 }}>•</span><span style={{ color: "#334155" }}>{w}</span>
            </div>
          ))}
        </PdfSection>
      </div>

      {/* ── Keyword Analysis ── */}
      <PdfSection title={`Keyword Analysis  (${foundKeywords.length} found / ${missingKeywords.length} missing)`} sectionId="keywords">
        {/* Coverage bar */}
        <PdfBar label="Keyword Coverage" value={keywordScore} color={scoreColor(keywordScore)} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {result.keywordAnalysis.map((k: KeywordAnalysisItem) => (
            <div key={k.keyword} style={{
              padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
              background: k.found ? "#dcfce7" : "#fee2e2",
              color: k.found ? "#15803d" : "#dc2626",
              border: `1px solid ${k.found ? "#bbf7d0" : "#fecaca"}`,
            }}>
              {k.found ? "✓" : "✗"} {k.keyword}
              {k.found && k.frequency != null && k.frequency > 0 && <span style={{ opacity: 0.6 }}> ×{k.frequency}</span>}
            </div>
          ))}
        </div>
        {missingKeywords.length > 0 && (
          <div style={{ marginTop: 12, background: "#fefce8", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#92400e", marginBottom: 6 }}>
              Add these keywords to improve your ATS score:
            </div>
            <div style={{ fontSize: 11, color: "#78350f" }}>
              {missingKeywords.map((k) => k.keyword).join(" · ")}
            </div>
          </div>
        )}
      </PdfSection>

      {/* ── Skill Gap Analysis ── */}
      <PdfSection title="Skill Gap Analysis" sectionId="skill-gap">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#15803d", marginBottom: 8 }}>Skills You Have</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {result.skillGapAnalysis.presentSkills.map((s: string) => (
                <span key={s} style={{ padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 600, background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" }}>{s}</span>
              ))}
            </div>
          </div>
          <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#be123c", marginBottom: 8 }}>Skills to Acquire</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {result.skillGapAnalysis.missingSkills.map((s: string) => (
                <span key={s} style={{ padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 600, background: "#ffe4e6", color: "#be123c", border: "1px solid #fecdd3" }}>{s}</span>
              ))}
            </div>
          </div>
        </div>
        {result.skillGapAnalysis.skillScores.map((s: SkillScore) => (
          <PdfBar key={s.skill} label={`${s.skill} (${s.category})`} value={s.score} color={scoreColor(s.score)} />
        ))}
      </PdfSection>

      {/* ── Career Roadmap ── */}
      <PdfSection title="Career Roadmap" sectionId="roadmap">
        {result.roadmap.map((phase: RoadmapPhase, i: number) => {
          const borderColor = phase.priority === "high" ? "#fca5a5" : phase.priority === "medium" ? "#fde68a" : "#93c5fd";
          const bgColor = phase.priority === "high" ? "#fff1f2" : phase.priority === "medium" ? "#fefce8" : "#eff6ff";
          return (
            <div key={phase.phase} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "#dbeafe", color: "#1e40af",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 12, flexShrink: 0, marginTop: 2,
              }}>{i + 1}</div>
              <div style={{ flex: 1, background: bgColor, border: `1.5px solid ${borderColor}`, borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{phase.phase}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{phase.title}</div>
                  </div>
                  <span style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 100, fontWeight: 600, textTransform: "capitalize",
                    background: phase.priority === "high" ? "#fee2e2" : phase.priority === "medium" ? "#fef9c3" : "#dbeafe",
                    color: phase.priority === "high" ? "#dc2626" : phase.priority === "medium" ? "#b45309" : "#1e40af",
                  }}>{phase.priority}</span>
                </div>
                {phase.items.map((item: string) => (
                  <div key={item} style={{ display: "flex", gap: 6, fontSize: 11, color: "#475569", marginTop: 4 }}>
                    <span style={{ color: "#1e40af", flexShrink: 0 }}>›</span>{item}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </PdfSection>

      {/* ── Suggestions ── */}
      <PdfSection title="Actionable Suggestions" sectionId="suggestions">
        {result.suggestions.map((s: string, i: number) => (
          <div key={s} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%", background: "#dbeafe",
              color: "#1e40af", display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 10, flexShrink: 0, marginTop: 1,
            }}>{i + 1}</div>
            <div style={{ fontSize: 11, color: "#334155", lineHeight: 1.65 }}>{s}</div>
          </div>
        ))}
      </PdfSection>

      {/* ── Detected Keywords ── */}
      {result.keywords.length > 0 && (
        <PdfSection title="Detected Keywords" sectionId="detected-keywords">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {result.keywords.map((kw: string) => (
              <span key={kw} style={{
                padding: "3px 10px", borderRadius: 100, fontSize: 10, fontWeight: 500,
                background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0",
              }}>{kw}</span>
            ))}
          </div>
        </PdfSection>
      )}

      {/* Footer */}
      <div data-pdf-section="footer" style={{ borderTop: "1px solid #e2e8f0", paddingTop: 16, marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, color: "#94a3b8" }}>
        <span>Generated by HireLens — AI-Powered Resume &amp; Interview Platform</span>
        <span style={{ fontWeight: 500 }}>Generated {date}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function ResumeAnalyzer() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [resumeText, setResumeText] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [result, setResult] = useState<ResumeAnalysisResult | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<ExtractedFile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const analyzeMutation = useAnalyzeResume();

  const handleFileExtracted = useCallback((file: ExtractedFile) => {
    setUploadedFile(file);
    setResumeText(file.text);
    toast({
      title: "Resume extracted!",
      description: `${file.name} — ~${file.text.trim().split(/\s+/).length.toLocaleString()} words ready to analyze.`,
    });
  }, [toast]);

  const handleFileClear = useCallback(() => {
    setUploadedFile(null);
    setResumeText("");
  }, []);

  const handleAnalyze = () => {
    if (resumeText.trim().length < 80) {
      toast({ title: "Resume too short", description: "Paste at least a paragraph of your resume.", variant: "destructive" });
      return;
    }
    analyzeMutation.mutate(
      { data: { resumeText, targetRole: targetRole || null } },
      {
        onSuccess: (data) => {
          setResult(data);
          setTimeout(() => reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);

          /* Save to Firestore for authenticated users (non-blocking) */
          if (user && isFirebaseConfigured) {
            setIsSaving(true);
            saveResumeAnalysis(user.uid, data, targetRole, resumeText)
              .then(() => {
                toast({
                  title: "Analysis saved",
                  description: "Your results have been saved to your account.",
                });
              })
              .catch(() => {
                toast({
                  title: "Couldn't save results",
                  description: "Analysis complete, but we couldn't save it to your account.",
                  variant: "destructive",
                });
              })
              .finally(() => setIsSaving(false));
          }
        },
        onError: () => toast({ title: "Error", description: "Failed to analyze. Please try again.", variant: "destructive" }),
      }
    );
  };

  const handleDownloadPDF = useCallback(async () => {
    if (!printRef.current || !result) return;
    setGeneratingPdf(true);
    try {
      const el = printRef.current;

      /* Measure section positions BEFORE html2canvas renders (it may reflow) */
      const containerRect = el.getBoundingClientRect();
      const sectionEls = Array.from(el.querySelectorAll("[data-pdf-section]"));
      const sectionRects = sectionEls.map((s) => {
        const r = s.getBoundingClientRect();
        return { top: r.top - containerRect.top, bottom: r.bottom - containerRect.top };
      });

      /* Render the full off-screen layout at 2× resolution */
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          const clonedEl = clonedDoc.querySelector("[data-pdf-root]") as HTMLElement | null;
          if (clonedEl) {
            clonedEl.style.background = "#ffffff";
            clonedEl.style.color = "#1e293b";
          }
        },
      });

      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();   // 595.28 pt
      const pageH = pdf.internal.pageSize.getHeight();  // 841.89 pt

      /* Conversion factors: DOM pixels → canvas pixels → PDF points */
      const contentHeightDom = containerRect.height || el.scrollHeight;
      const domToCanvas = canvas.height / contentHeightDom;
      const canvasToPdf = pageW / canvas.width;

      /* Helper: draw a vertical slice of the full canvas onto a new canvas */
      const sliceCanvas = (startPx: number, heightPx: number): HTMLCanvasElement => {
        const sc = document.createElement("canvas");
        sc.width = canvas.width;
        sc.height = Math.ceil(heightPx);
        const ctx = sc.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, sc.width, sc.height);
        ctx.drawImage(canvas, 0, startPx, canvas.width, heightPx, 0, 0, canvas.width, heightPx);
        return sc;
      };

      if (sectionRects.length === 0) {
        /* Fallback: simple fixed-height slicing */
        const totalHeightPt = canvas.height * canvasToPdf;
        const totalPages = Math.ceil(totalHeightPt / pageH);
        for (let p = 0; p < totalPages; p++) {
          if (p > 0) pdf.addPage();
          const startPx = (p * pageH) / canvasToPdf;
          const hPx = Math.min(pageH / canvasToPdf, canvas.height - startPx);
          const sc = sliceCanvas(startPx, hPx);
          pdf.addImage(sc.toDataURL("image/png"), "PNG", 0, 0, pageW, hPx * canvasToPdf);
        }
      } else {
        /* Section-aware pagination: group sections that fit on one A4 page */
        const BOTTOM_MARGIN_PT = 30; // safety breathing room before cutting
        const sections = sectionRects.map((s) => ({
          topPt: s.top * domToCanvas * canvasToPdf,
          bottomPt: s.bottom * domToCanvas * canvasToPdf,
        }));

        const pages: { startPt: number; endPt: number }[] = [];
        for (const sect of sections) {
          if (pages.length === 0) {
            pages.push({ startPt: sect.topPt, endPt: sect.bottomPt });
          } else {
            const last = pages[pages.length - 1];
            if (sect.bottomPt - last.startPt <= pageH - BOTTOM_MARGIN_PT) {
              last.endPt = sect.bottomPt;
            } else {
              pages.push({ startPt: sect.topPt, endPt: sect.bottomPt });
            }
          }
        }

        for (let i = 0; i < pages.length; i++) {
          if (i > 0) pdf.addPage();
          const { startPt, endPt } = pages[i];
          const startPx = startPt / canvasToPdf;
          const hPx = (endPt - startPt) / canvasToPdf;
          const sc = sliceCanvas(startPx, hPx);
          pdf.addImage(sc.toDataURL("image/png"), "PNG", 0, 0, pageW, endPt - startPt);
        }
      }

      const filename = `HireLens_Resume_Analysis_${targetRole ? targetRole.replace(/\s+/g, "_") : "Report"}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);
      toast({ title: "PDF Downloaded!", description: `Saved as ${filename}` });
    } catch {
      toast({ title: "PDF Error", description: "Failed to generate PDF. Please try again.", variant: "destructive" });
    } finally {
      setGeneratingPdf(false);
    }
  }, [result, targetRole, toast]);

  const foundKeywords = result?.keywordAnalysis?.filter((k) => k.found) ?? [];
  const missingKeywords = result?.keywordAnalysis?.filter((k) => !k.found) ?? [];
  const keywordScore = result?.keywordAnalysis?.length
    ? Math.round((foundKeywords.length / result.keywordAnalysis.length) * 100) : 0;

  const skillCategories = result?.skillGapAnalysis?.skillScores
    ? Object.entries(
        result.skillGapAnalysis.skillScores.reduce<Record<string, number[]>>((acc, s) => {
          if (!acc[s.category]) acc[s.category] = [];
          acc[s.category].push(s.score);
          return acc;
        }, {})
      ).map(([cat, scores]) => ({
        subject: cat,
        score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      }))
    : [];

  const reportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">

      {/* ── Hidden print layout (off-screen) ── */}
      {result && (
        <div
          ref={printRef}
          data-pdf-root="true"
          aria-hidden="true"
          style={{
            position: "fixed",
            top: 0,
            left: "-9999px",
            zIndex: -1,
            pointerEvents: "none",
            width: PDF_WIDTH,
            overflow: "visible",
          }}
        >
          <PdfReportLayout result={result} targetRole={targetRole} date={reportDate} />
        </div>
      )}

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Resume Analyzer</h1>
            <p className="text-muted-foreground mt-1">
              AI-powered analysis with ATS scoring, skill gaps, career roadmap, and keyword intelligence.
            </p>
          </div>
          {result && (
            <Button onClick={handleDownloadPDF} disabled={generatingPdf} variant="outline" className="gap-2 shrink-0">
              <Download className="h-4 w-4" />
              {generatingPdf ? "Generating PDF…" : "Download Report"}
            </Button>
          )}
        </div>
      </motion.div>

      {/* ── Input Card ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="mt-8 border-border/60">
          <CardContent className="pt-6 space-y-5">
            {/* Target role */}
            <div className="space-y-1.5">
              <Label>Target Role <span className="text-muted-foreground font-normal">(optional — improves analysis)</span></Label>
              <Input
                placeholder="e.g. AI Engineer, Senior Frontend Developer, Data Scientist"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                disabled={analyzeMutation.isPending}
              />
            </div>

            {/* File upload zone */}
            <div className="space-y-1.5">
              <Label>Resume File</Label>
              <FileUploadZone
                onExtracted={handleFileExtracted}
                onClear={handleFileClear}
                disabled={analyzeMutation.isPending}
              />
            </div>

            {/* Divider */}
            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-border/60" />
              <span className="text-xs text-muted-foreground bg-background px-2 shrink-0">
                or paste manually
              </span>
              <div className="flex-1 h-px bg-border/60" />
            </div>

            {/* Manual text fallback */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className={uploadedFile ? "text-muted-foreground" : ""}>
                  Resume Text
                  {!uploadedFile && <span className="font-normal text-muted-foreground"> *</span>}
                </Label>
                {uploadedFile && resumeText && (
                  <span className="text-xs text-muted-foreground">
                    Extracted from <span className="text-primary font-medium">{uploadedFile.name}</span> — edit if needed
                  </span>
                )}
              </div>
              <Textarea
                placeholder="Paste your full resume text here — work experience, skills, education, projects, certifications..."
                value={resumeText}
                onChange={(e) => {
                  setResumeText(e.target.value);
                  /* If user edits the extracted text, detach from the file */
                  if (uploadedFile && e.target.value !== uploadedFile.text) {
                    setUploadedFile(null);
                  }
                }}
                rows={uploadedFile ? 6 : 10}
                disabled={analyzeMutation.isPending}
                className={`font-mono text-sm resize-y transition-opacity ${uploadedFile ? "opacity-70 focus:opacity-100" : ""}`}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{resumeText.length.toLocaleString()} characters</span>
                <span className={resumeText.length >= 80 ? "text-green-500" : ""}>
                  {resumeText.length >= 80 ? "✓ Ready to analyze" : `${80 - resumeText.length} more chars needed`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleAnalyze}
                disabled={analyzeMutation.isPending || resumeText.trim().length < 80}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {analyzeMutation.isPending ? "Analyzing with AI…" : "Analyze Resume"}
              </Button>

              {isSaving && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
                  <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Saving to account…
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Loading Skeleton ── */}
      {analyzeMutation.isPending && (
        <div className="mt-10 space-y-5">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            AI is analyzing your resume — this takes about 10–15 seconds…
          </div>
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />)}
          </div>
          <div className="h-64 rounded-xl bg-muted animate-pulse" />
          <div className="grid sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
          </div>
        </div>
      )}

      {/* ═══ RESULTS DASHBOARD ═══ */}
      <AnimatePresence>
        {result && !analyzeMutation.isPending && (
          <motion.div ref={reportRef}
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="mt-10 space-y-8">

            {/* Score Overview */}
            <Card className="border-border/60 overflow-hidden">
              <div className="h-1.5 w-full bg-gradient-to-r from-primary via-blue-400 to-cyan-400" />
              <CardContent className="pt-8 pb-8">
                <div className="flex flex-wrap gap-10 justify-center sm:justify-start mb-8">
                  <ScoreRing score={result.overallScore} label="Overall Score" sublabel="Resume quality" color={scoreColor(result.overallScore)} size={130} />
                  {result.atsScore != null && (
                    <ScoreRing score={result.atsScore} label="ATS Score" sublabel="Applicant Tracking" color={scoreColor(result.atsScore)} size={130} />
                  )}
                  <ScoreRing score={keywordScore} label="Keyword Match" sublabel={`${foundKeywords.length}/${result.keywordAnalysis.length} found`} color={scoreColor(keywordScore)} size={130} />
                </div>
                <div className="bg-muted/30 rounded-xl p-4 border border-border/40">
                  <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
                </div>
              </CardContent>
            </Card>

            {/* Tabs Dashboard */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="mb-6 w-full sm:w-auto flex-wrap h-auto gap-1">
                <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
                  <TrendingUp className="h-3.5 w-3.5" /> Overview
                </TabsTrigger>
                <TabsTrigger value="keywords" className="gap-1.5 text-xs sm:text-sm">
                  <Tag className="h-3.5 w-3.5" /> Keywords
                </TabsTrigger>
                <TabsTrigger value="skills" className="gap-1.5 text-xs sm:text-sm">
                  <Zap className="h-3.5 w-3.5" /> Skills
                </TabsTrigger>
                <TabsTrigger value="roadmap" className="gap-1.5 text-xs sm:text-sm">
                  <Map className="h-3.5 w-3.5" /> Roadmap
                </TabsTrigger>
                <TabsTrigger value="feedback" className="gap-1.5 text-xs sm:text-sm">
                  <Lightbulb className="h-3.5 w-3.5" /> Feedback
                </TabsTrigger>
              </TabsList>

              {/* OVERVIEW */}
              <TabsContent value="overview" className="space-y-6 mt-0">
                {result.sectionScores.length > 0 && (
                  <Card className="border-border/60">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" /> Section Scores
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={result.sectionScores} margin={{ top: 4, right: 16, left: -16, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/40" />
                          <XAxis dataKey="section" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={48}>
                            {result.sectionScores.map((s: SectionScore) => (
                              <Cell key={s.section} fill={scoreColor(s.score)} fillOpacity={0.85} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="mt-4 space-y-3">
                        {result.sectionScores.map((s: SectionScore) => (
                          <div key={s.section} className="flex items-start gap-3">
                            <div className={`text-xs font-bold px-2 py-1 rounded-md min-w-[42px] text-center ${scoreBg(s.score)}`}>{s.score}%</div>
                            <div>
                              <div className="text-sm font-medium">{s.section}</div>
                              <div className="text-xs text-muted-foreground">{s.feedback}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                <div className="grid sm:grid-cols-2 gap-5">
                  <Card className="border-border/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-4 w-4" /> Strengths
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {result.strengths.map((s: string) => (
                        <div key={s} className="flex gap-2.5 text-sm">
                          <span className="text-green-500 font-bold mt-0.5 shrink-0">✓</span>
                          <span className="text-muted-foreground">{s}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                  <Card className="border-border/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2 text-red-500">
                        <AlertCircle className="h-4 w-4" /> Areas to Improve
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {result.weaknesses.map((w: string) => (
                        <div key={w} className="flex gap-2.5 text-sm">
                          <span className="text-red-400 font-bold mt-0.5 shrink-0">!</span>
                          <span className="text-muted-foreground">{w}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* KEYWORDS */}
              <TabsContent value="keywords" className="space-y-6 mt-0">
                <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-muted/30 border border-border/40">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                    <span className="font-medium text-green-600 dark:text-green-400">{foundKeywords.length} Found</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    <span className="font-medium text-red-500">{missingKeywords.length} Missing</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm ml-auto">
                    <span className="text-muted-foreground">Match Rate:</span>
                    <span className={`font-bold ${scoreBg(keywordScore)}`}>{keywordScore}%</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Keyword Coverage</span><span>{keywordScore}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ backgroundColor: scoreColor(keywordScore) }}
                      initial={{ width: 0 }} animate={{ width: `${keywordScore}%` }}
                      transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }} />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {result.keywordAnalysis.map((item: KeywordAnalysisItem) => (
                    <motion.div key={item.keyword} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
                      <KeywordBadge item={item} />
                    </motion.div>
                  ))}
                </div>
                {missingKeywords.length > 0 && (
                  <Card className="border-yellow-300/50 bg-yellow-50/50 dark:bg-yellow-950/20">
                    <CardContent className="pt-5">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-sm mb-2">Add these missing keywords to boost your ATS score:</div>
                          <div className="flex flex-wrap gap-2">
                            {missingKeywords.map((k: KeywordAnalysisItem) => (
                              <span key={k.keyword} className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-xs font-medium border border-yellow-200 dark:border-yellow-800/40">
                                + {k.keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* SKILLS */}
              <TabsContent value="skills" className="space-y-6 mt-0">
                <div className="grid md:grid-cols-2 gap-6">
                  {skillCategories.length > 2 && (
                    <Card className="border-border/60">
                      <CardHeader className="pb-2"><CardTitle className="text-base">Skill Radar</CardTitle></CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={260}>
                          <RadarChart data={skillCategories}>
                            <PolarGrid stroke="currentColor" className="text-border/40" />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                            <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} tickCount={5} />
                            <Radar name="Score" dataKey="score" stroke="hsl(221.2 83.2% 53.3%)"
                              fill="hsl(221.2 83.2% 53.3%)" fillOpacity={0.25} strokeWidth={2} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                  <Card className="border-border/60">
                    <CardHeader className="pb-2"><CardTitle className="text-base">Skill Proficiency</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {result.skillGapAnalysis.skillScores.map((s: SkillScore, i: number) => (
                        <motion.div key={s.skill} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{s.skill}</span>
                              <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">{s.category}</span>
                            </div>
                            <span className={`font-bold text-xs ${scoreBg(s.score)}`}>{s.score}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <motion.div className="h-full rounded-full" style={{ backgroundColor: scoreColor(s.score) }}
                              initial={{ width: 0 }} animate={{ width: `${s.score}%` }}
                              transition={{ duration: 1, ease: "easeOut", delay: i * 0.05 + 0.2 }} />
                          </div>
                        </motion.div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  <Card className="border-green-300/50 bg-green-50/30 dark:bg-green-950/10">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCheck className="h-4 w-4" /> Skills You Have
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {result.skillGapAnalysis.presentSkills.map((skill: string) => (
                          <span key={skill} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200/60 dark:border-green-800/40">
                            <Circle className="h-2 w-2 fill-current" /> {skill}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-red-300/50 bg-red-50/30 dark:bg-red-950/10">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2 text-red-500">
                        <Target className="h-4 w-4" /> Skills to Acquire
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {result.skillGapAnalysis.missingSkills.map((skill: string) => (
                          <span key={skill} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-200/60 dark:border-red-800/40">
                            <Target className="h-2.5 w-2.5" /> {skill}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* ROADMAP */}
              <TabsContent value="roadmap" className="space-y-4 mt-0">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <Map className="h-5 w-5 text-primary shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Your personalized roadmap{targetRole ? ` for ${targetRole}` : ""} — prioritized steps to make your resume stand out.
                  </p>
                </div>
                <div className="relative">
                  <div className="absolute left-5 top-8 bottom-8 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-primary/10 hidden sm:block" />
                  <div className="space-y-4">
                    {result.roadmap.map((phase: RoadmapPhase, i: number) => (
                      <motion.div key={phase.phase} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1, duration: 0.35 }} className="relative sm:pl-14">
                        <div className="hidden sm:flex absolute left-2.5 top-5 h-5 w-5 rounded-full border-2 border-primary bg-background items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        </div>
                        <Card className={`border-2 ${priorityStyle(phase.priority)}`}>
                          <CardContent className="pt-5 pb-4">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div>
                                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{phase.phase}</div>
                                <div className="font-semibold text-sm mt-0.5">{phase.title}</div>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full capitalize font-medium shrink-0 ${priorityBadge(phase.priority)}`}>
                                {phase.priority}
                              </span>
                            </div>
                            <ul className="space-y-2">
                              {phase.items.map((item: string) => (
                                <li key={item} className="flex gap-2.5 text-sm text-muted-foreground">
                                  <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />{item}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* FEEDBACK */}
              <TabsContent value="feedback" className="space-y-5 mt-0">
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-primary" /> Actionable Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-4">
                      {result.suggestions.map((s: string, i: number) => (
                        <motion.li key={s} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.07 }} className="flex gap-3 text-sm text-muted-foreground">
                          <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          {s}
                        </motion.li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
                {result.keywords.length > 0 && (
                  <Card className="border-border/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Tag className="h-4 w-4 text-primary" /> Detected Keywords
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {result.keywords.map((kw: string) => (
                          <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
