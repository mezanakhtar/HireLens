import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ScanEye, Menu, X, UserIcon, LogOut, LayoutDashboard, Settings, Loader2 } from "lucide-react";
import { useState, useCallback } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

/* Derive initials from displayName or email */
function getUserInitials(displayName: string | null, email: string | null): string {
  if (displayName?.trim()) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.charAt(0).toUpperCase();
  return "U";
}

/* Deterministic avatar background from email */
function getUserColor(email: string | null): string {
  const colors = [
    "bg-blue-500", "bg-violet-500", "bg-emerald-500",
    "bg-rose-500", "bg-amber-500", "bg-cyan-500",
    "bg-pink-500", "bg-indigo-500",
  ];
  if (!email) return colors[0];
  const hash = email.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export function Navbar() {
  const { user, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { toast } = useToast();

  const navLinks = [
    { href: "/categories",        label: "Categories"    },
    { href: "/mock-interview",    label: "Mock Interview" },
    { href: "/resume",            label: "Resume"        },
    { href: "/tips",              label: "Tips"          },
    ...(user ? [
      { href: "/my-analyses",       label: "My Analyses"      },
      { href: "/interview-history", label: "History"           },
    ] : []),
  ];

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    setIsMobileMenuOpen(false);
    try {
      await signOut();
      setLocation("/");
      toast({ title: "Signed out", description: "You have been successfully signed out." });
    } catch {
      toast({
        title: "Sign out failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSigningOut(false);
    }
  }, [signOut, setLocation, toast]);

  const initials = getUserInitials(user?.displayName ?? null, user?.email ?? null);
  const avatarColor = getUserColor(user?.email ?? null);

  return (
    <nav aria-label="Main navigation" className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">

        {/* ── Left: Logo + Nav links ── */}
        <div className="flex items-center gap-6 md:gap-10">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl" aria-label="HireLens home">
            <ScanEye className="h-6 w-6 text-primary" aria-hidden="true" />
            <span>HireLens</span>
          </Link>

          <div className="hidden md:flex gap-6" role="list">
            {navLinks.map((link) => {
              const isActive = location.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  role="listitem"
                  aria-current={isActive ? "page" : undefined}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Right: Theme toggle + Auth ── */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-9 w-9 rounded-full p-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    disabled={isSigningOut}
                    aria-label="Account menu"
                  >
                    {isSigningOut ? (
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className={`${avatarColor} text-white text-sm font-semibold`}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-60" align="end" forceMount>
                  {/* User info header */}
                  <DropdownMenuLabel className="font-normal p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className={`${avatarColor} text-white text-sm font-semibold`}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        {user.displayName && (
                          <p className="font-semibold text-sm truncate">{user.displayName}</p>
                        )}
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="w-full cursor-pointer flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="w-full cursor-pointer flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Profile Settings
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer flex items-center gap-2"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                  >
                    {isSigningOut ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    {isSigningOut ? "Signing out…" : "Log out"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/login">Sign up</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            className="md:hidden p-0 w-8 h-8"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav"
          >
            {isMobileMenuOpen
              ? <X className="h-5 w-5" aria-hidden="true" />
              : <Menu className="h-5 w-5" aria-hidden="true" />}
          </Button>
        </div>
      </div>

      {/* ── Mobile Menu ── */}
      {isMobileMenuOpen && (
        <div id="mobile-nav" className="md:hidden border-b bg-background px-4 py-4 space-y-4">
          <div className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.startsWith(link.href) ? "text-primary" : "text-muted-foreground"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-4 border-t">
            {user ? (
              <div className="flex flex-col space-y-1">
                {/* Mobile user info */}
                <div className="flex items-center gap-3 px-1 py-2 mb-2">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className={`${avatarColor} text-white text-sm font-semibold`}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    {user.displayName && (
                      <p className="font-semibold text-sm truncate">{user.displayName}</p>
                    )}
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>

                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary px-1 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary px-1 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  Profile Settings
                </Link>

                <div className="pt-1 mt-1 border-t">
                  <button
                    className="flex items-center gap-2 w-full text-sm font-medium text-destructive px-1 py-1.5 rounded-md hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                  >
                    {isSigningOut ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    {isSigningOut ? "Signing out…" : "Log out"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  asChild
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Link href="/login">Log in</Link>
                </Button>
                <Button
                  className="w-full"
                  asChild
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Link href="/login">Sign up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
