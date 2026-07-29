import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ScanEye, Eye, EyeOff, AlertCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = loginSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginData = z.infer<typeof loginSchema>;
type SignupData = z.infer<typeof signupSchema>;

export default function Login() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn, signUp, isConfigured } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  /* ── Forgot password state ── */
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const handleForgotPassword = async () => {
    if (!auth) {
      setForgotError("Firebase is not configured.");
      return;
    }
    const trimmed = forgotEmail.trim();
    if (!trimmed) { setForgotError("Please enter your email address."); return; }
    if (!/\S+@\S+\.\S+/.test(trimmed)) { setForgotError("Please enter a valid email address."); return; }
    setForgotLoading(true);
    setForgotError(null);
    try {
      await sendPasswordResetEmail(auth, trimmed);
      toast({ title: "Email sent!", description: "Password reset email sent successfully." });
      setForgotOpen(false);
      setForgotEmail("");
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? "";
      if (code === "auth/user-not-found") setForgotError("No account found with that email address.");
      else if (code === "auth/invalid-email") setForgotError("Please enter a valid email address.");
      else if (code === "auth/network-request-failed") setForgotError("Network error. Please check your connection.");
      else setForgotError("Something went wrong. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignupData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", confirmPassword: "", name: "" },
  });

  const handleLogin = async (data: LoginData) => {
    setError(null);
    try {
      await signIn(data.email, data.password);
      toast({ title: "Welcome back!", description: "Logged in successfully." });
      setLocation("/dashboard");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Login failed";
      setError(msg.includes("invalid-credential") ? "Invalid email or password." : msg);
    }
  };

  const handleSignup = async (data: SignupData) => {
    setError(null);
    try {
      await signUp(data.email, data.password, data.name);
      toast({ title: "Account created!", description: "Welcome to HireLens!" });
      setLocation("/dashboard");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Signup failed";
      setError(msg.includes("email-already-in-use") ? "This email is already registered." : msg);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2 font-bold text-xl">
          <ScanEye className="h-6 w-6 text-primary" />
          <span>HireLens</span>
        </a>
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {!isConfigured && (
            <Alert className="mb-6 border-yellow-400/50 bg-yellow-50 dark:bg-yellow-900/20">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                Firebase is not configured. The app is running in demo mode. Add Firebase credentials to enable real auth.
              </AlertDescription>
            </Alert>
          )}

          <Card className="border-border/60 shadow-lg">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </CardTitle>
              <CardDescription>
                {mode === "login"
                  ? "Sign in to continue your interview prep"
                  : "Start your interview preparation journey"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Toggle */}
              <div className="flex rounded-lg overflow-hidden border border-border p-1 bg-muted/40">
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(null); }}
                  className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
                    mode === "login" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setError(null); }}
                  className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
                    mode === "signup" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {mode === "login" ? (
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      data-testid="input-email"
                      {...loginForm.register("email")}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        data-testid="input-password"
                        {...loginForm.register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <div className="text-right -mt-1">
                    <button
                      type="button"
                      onClick={() => { setForgotEmail(""); setForgotError(null); setForgotOpen(true); }}
                      className="text-xs text-primary hover:underline focus:outline-none"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    data-testid="button-login"
                    disabled={loginForm.formState.isSubmitting}
                  >
                    {loginForm.formState.isSubmitting ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" placeholder="Jane Doe" autoComplete="name" data-testid="input-name" {...signupForm.register("name")} />
                    {signupForm.formState.errors.name && (
                      <p className="text-xs text-destructive">{signupForm.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" placeholder="you@example.com" autoComplete="email" data-testid="input-signup-email" {...signupForm.register("email")} />
                    {signupForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{signupForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Min. 6 characters"
                        autoComplete="new-password"
                        data-testid="input-signup-password"
                        {...signupForm.register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {signupForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{signupForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      data-testid="input-confirm-password"
                      {...signupForm.register("confirmPassword")}
                    />
                    {signupForm.formState.errors.confirmPassword && (
                      <p className="text-xs text-destructive">{signupForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    data-testid="button-signup"
                    disabled={signupForm.formState.isSubmitting}
                  >
                    {signupForm.formState.isSubmitting ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Forgot Password Dialog ── */}
      <Dialog open={forgotOpen} onOpenChange={(o) => { setForgotOpen(o); if (!o) { setForgotError(null); setForgotEmail(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Forgot your password?
            </DialogTitle>
            <DialogDescription>
              Enter your registered email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email">Email address</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="you@example.com"
                value={forgotEmail}
                onChange={(e) => { setForgotEmail(e.target.value); setForgotError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleForgotPassword(); } }}
                disabled={forgotLoading}
              />
            </div>
            {forgotError && (
              <p className="text-xs text-destructive flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {forgotError}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setForgotOpen(false)}
              disabled={forgotLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleForgotPassword}
              disabled={forgotLoading || !forgotEmail.trim()}
            >
              {forgotLoading ? "Sending…" : "Send Reset Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
