import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScanEye, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-6"
      >
        {/* Brand mark */}
        <div className="flex justify-center mb-2">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ScanEye className="h-8 w-8 text-primary" />
          </div>
        </div>

        {/* Big 404 */}
        <div>
          <p className="text-8xl font-black text-primary/20 leading-none select-none">404</p>
          <h1 className="text-2xl font-bold mt-2">Page not found</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            This page doesn't exist or may have been moved. Let's get you back on track.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button asChild className="gap-2">
            <Link href="/"><Home className="h-4 w-4" /> Back to Home</Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground pt-2">
          HireLens — AI Interview Preparation Platform
        </p>
      </motion.div>
    </div>
  );
}
