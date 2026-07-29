import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { useLocation } from "wouter";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const isAuthPage = location === "/login";
  const isMockInterview = location === "/mock-interview";

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans">
      {/* Skip-to-content for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-primary-foreground focus:text-sm focus:font-medium focus:outline-none focus:shadow-lg"
      >
        Skip to main content
      </a>

      {!isAuthPage && <Navbar />}

      <main
        id="main-content"
        tabIndex={-1}
        className={`flex-1 flex flex-col outline-none ${isMockInterview ? "overflow-hidden" : ""}`}
      >
        {children}
      </main>

      {!isAuthPage && !isMockInterview && <Footer />}
    </div>
  );
}
