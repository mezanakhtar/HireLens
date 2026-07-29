import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, FileX, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  validateFile,
  extractResumeText,
  MAX_FILE_SIZE_MB,
  type ExtractedFile,
} from "@/lib/resume-extractor";

type UploadState =
  | { status: "idle" }
  | { status: "dragging" }
  | { status: "extracting"; fileName: string; progress: number }
  | { status: "success"; file: ExtractedFile }
  | { status: "error"; message: string; fileName?: string };

type Props = {
  onExtracted: (file: ExtractedFile) => void;
  onClear: () => void;
  disabled?: boolean;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function FileUploadZone({ onExtracted, onClear, disabled }: Props) {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const processFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setState({ status: "error", message: validationError, fileName: file.name });
        return;
      }

      setState({ status: "extracting", fileName: file.name, progress: 0 });

      /* Simulate incremental progress (actual extraction has no progress API) */
      const tickInterval = setInterval(() => {
        setState((prev) => {
          if (prev.status !== "extracting") { clearInterval(tickInterval); return prev; }
          const next = Math.min(prev.progress + Math.random() * 18 + 4, 85);
          return { ...prev, progress: next };
        });
      }, 250);

      try {
        const extracted = await extractResumeText(file);
        clearInterval(tickInterval);
        setState({ status: "success", file: extracted });
        onExtracted(extracted);
      } catch (err) {
        clearInterval(tickInterval);
        const message =
          err instanceof Error
            ? err.message
            : "Failed to extract text from the file. Please paste your resume manually.";
        setState({ status: "error", message, fileName: file.name });
      }
    },
    [onExtracted]
  );

  /* ── Drag events ── */
  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (e.dataTransfer.items.length > 0) setState({ status: "dragging" });
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setState({ status: "idle" });
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile]
  );

  const handleClear = useCallback(() => {
    setState({ status: "idle" });
    onClear();
  }, [onClear]);

  const handleRetry = useCallback(() => {
    setState({ status: "idle" });
    inputRef.current?.click();
  }, []);

  /* ── Render states ── */

  if (state.status === "success") {
    const { file } = state;
    const ext = file.type.toUpperCase();
    const wordCount = file.text.trim().split(/\s+/).length;
    return (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-green-400/50 bg-green-50/60 dark:bg-green-950/20 dark:border-green-700/50"
      >
        <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-green-700 dark:text-green-300 truncate max-w-[280px]">
              {file.name}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-green-200/70 dark:bg-green-800/60 text-green-700 dark:text-green-300 font-semibold shrink-0">
              {ext}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
            <span>{formatBytes(file.size)}</span>
            <span className="text-border">·</span>
            <span className="text-green-600 dark:text-green-400 font-medium">
              ~{wordCount.toLocaleString()} words extracted
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={handleClear}
          title="Remove file"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </motion.div>
    );
  }

  if (state.status === "extracting") {
    const pct = Math.round(state.progress);
    return (
      <div className="flex flex-col gap-2 px-4 py-3 rounded-xl border-2 border-primary/40 bg-primary/5 dark:bg-primary/10">
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
          <span className="text-sm font-medium text-primary truncate">{state.fileName}</span>
          <span className="ml-auto text-xs text-muted-foreground shrink-0">{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-primary/20 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
        <p className="text-xs text-muted-foreground">Extracting text — this takes a few seconds…</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 px-4 py-3 rounded-xl border-2 border-red-400/50 bg-red-50/60 dark:bg-red-950/20 dark:border-red-700/50"
      >
        <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {state.fileName && (
            <div className="text-xs text-muted-foreground mb-1 truncate">{state.fileName}</div>
          )}
          <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 mt-1 text-xs text-red-500 hover:text-red-600 dark:text-red-400"
            onClick={handleRetry}
          >
            Try another file
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground"
          onClick={handleClear}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </motion.div>
    );
  }

  /* ── Idle / Dragging ── */
  const isDragging = state.status === "dragging";

  return (
    <div
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        relative flex flex-col items-center justify-center gap-3
        px-6 py-8 rounded-xl border-2 border-dashed cursor-pointer
        transition-all duration-200 select-none
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${isDragging
          ? "border-primary bg-primary/8 scale-[1.01]"
          : "border-border/60 bg-muted/20 hover:border-primary/60 hover:bg-primary/5"
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="sr-only"
        onChange={onInputChange}
        disabled={disabled}
        data-testid="input-file-upload"
      />

      <AnimatePresence mode="wait">
        {isDragging ? (
          <motion.div key="dragging"
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
            className="h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center">
            <Upload className="h-6 w-6 text-primary" />
          </motion.div>
        ) : (
          <motion.div key="idle"
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
            className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center">
        <p className={`text-sm font-medium transition-colors ${isDragging ? "text-primary" : "text-foreground"}`}>
          {isDragging ? "Drop your resume here" : "Upload your resume"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Drag & drop or <span className="text-primary font-medium">click to browse</span>
          {" · "}PDF and DOCX{" · "}Max {MAX_FILE_SIZE_MB} MB
        </p>
      </div>

      {/* File type badges */}
      <div className="flex gap-2">
        {["PDF", "DOCX"].map((type) => (
          <span key={type} className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium border border-border/60">
            {type}
          </span>
        ))}
      </div>
    </div>
  );
}
