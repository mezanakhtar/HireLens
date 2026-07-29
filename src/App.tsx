import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Categories from "@/pages/Categories";
import DifficultySelect from "@/pages/DifficultySelect";
import Practice from "@/pages/Practice";
import InterviewHistory from "@/pages/InterviewHistory";
import MockInterview from "@/pages/MockInterview";
import ResumeAnalyzer from "@/pages/ResumeAnalyzer";
import MyAnalyses from "@/pages/MyAnalyses";
import AnalysisDetail from "@/pages/AnalysisDetail";
import CompareResumes from "@/pages/CompareResumes";
import Tips from "@/pages/Tips";
import Profile from "@/pages/Profile";
import About from "@/pages/About";
import Contact from "@/pages/Contact";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
        <Route path="/categories" component={Categories} />
        <Route path="/tips" component={Tips} />
        <Route path="/dashboard">
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        </Route>
        {/* Difficulty selection — must appear before /practice/:categoryId */}
        <Route path="/practice/:categoryId/difficulty">
          {() => (
            <ProtectedRoute><DifficultySelect /></ProtectedRoute>
          )}
        </Route>
        <Route path="/practice/:categoryId">
          {() => (
            <ProtectedRoute><Practice /></ProtectedRoute>
          )}
        </Route>
        <Route path="/mock-interview">
          <ProtectedRoute><MockInterview /></ProtectedRoute>
        </Route>
        <Route path="/resume">
          <ProtectedRoute><ResumeAnalyzer /></ProtectedRoute>
        </Route>
        <Route path="/my-analyses/:id">
          {() => (
            <ProtectedRoute><AnalysisDetail /></ProtectedRoute>
          )}
        </Route>
        <Route path="/my-analyses">
          <ProtectedRoute><MyAnalyses /></ProtectedRoute>
        </Route>
        <Route path="/compare-resumes">
          <ProtectedRoute><CompareResumes /></ProtectedRoute>
        </Route>
        <Route path="/profile">
          <ProtectedRoute><Profile /></ProtectedRoute>
        </Route>
        <Route path="/interview-history">
          <ProtectedRoute><InterviewHistory /></ProtectedRoute>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="hirelens-theme">
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
