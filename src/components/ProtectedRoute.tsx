import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isConfigured } = useAuth();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="space-y-4 w-full max-w-md px-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
        </div>
      </div>
    );
  }

  if (!isConfigured) return <>{children}</>;
  if (!user) return <Redirect to="/login" />;

  return <>{children}</>;
}
