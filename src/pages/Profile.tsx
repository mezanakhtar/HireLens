import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { User, Moon, Sun, Monitor, Shield, TrendingUp, MessageSquare, FileText } from "lucide-react";

export default function Profile() {
  const { user, signOut, updateDisplayName } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [saving, setSaving] = useState(false);

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      await updateDisplayName(displayName);
      toast({ title: "Name updated", description: "Your display name has been saved." });
    } catch {
      toast({ title: "Error", description: "Failed to update name.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? "U";

  const stats = [
    { label: "Mock Interviews", value: "3", icon: <MessageSquare className="h-4 w-4" /> },
    { label: "Questions Practiced", value: "24", icon: <TrendingUp className="h-4 w-4" /> },
    { label: "Resume Analyses", value: "1", icon: <FileText className="h-4 w-4" /> },
    { label: "Avg. Score", value: "8.0 / 10", icon: <Shield className="h-4 w-4" /> },
  ];

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences.</p>
      </motion.div>

      <div className="mt-8 space-y-6">
        {/* Profile Card */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold">{user?.displayName ?? "No name set"}</div>
                <div className="text-sm text-muted-foreground">{user?.email}</div>
                <Badge variant="secondary" className="mt-1 text-xs">Free Plan</Badge>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Display Name</Label>
              <div className="flex gap-2">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your full name"
                  data-testid="input-display-name"
                  className="flex-1"
                />
                <Button onClick={handleSaveName} disabled={saving || !displayName.trim()} data-testid="button-save-name">
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={user?.email ?? ""} disabled className="bg-muted/40" />
              <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
            </div>
          </CardContent>
        </Card>

        {/* Theme */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Appearance</CardTitle>
          </CardHeader>
          <CardContent>
            <Label className="mb-3 block">Theme Preference</Label>
            <div className="flex gap-3">
              {[
                { value: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
                { value: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
                { value: "system", label: "System", icon: <Monitor className="h-4 w-4" /> },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value as "light" | "dark" | "system")}
                  className={`flex-1 flex flex-col items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    theme === t.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                  data-testid={`button-theme-${t.value}`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Your Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((s) => (
                <div key={s.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {s.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-lg text-destructive">Sign Out</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Sign out of your HireLens account on this device.</p>
            <Button variant="destructive" onClick={signOut} data-testid="button-signout">Sign Out</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
