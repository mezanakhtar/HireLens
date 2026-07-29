import { Link } from "wouter";
import { ScanEye } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-muted/40 mt-auto">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl mb-4">
              <ScanEye className="h-6 w-6 text-primary" />
              <span>HireLens</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm">
              Your AI-powered career lens. Prepare for technical, behavioral, and HR interviews — and walk in with confidence.
            </p>
          </div>
          
          <div>
            <h3 className="font-medium mb-4">Product</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/categories" className="hover:text-foreground transition-colors">Categories</Link></li>
              <li><Link href="/mock-interview" className="hover:text-foreground transition-colors">Mock Interview</Link></li>
              <li><Link href="/resume" className="hover:text-foreground transition-colors">Resume Analyzer</Link></li>
              <li><Link href="/tips" className="hover:text-foreground transition-colors">Interview Tips</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} HireLens. All rights reserved.
          </p>
          <div className="text-xs text-muted-foreground">
            Built with Replit Agent
          </div>
        </div>
      </div>
    </footer>
  );
}
