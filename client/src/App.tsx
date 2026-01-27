import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";
import { NotificationsBell } from "@/components/notifications-bell";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Chatbots from "@/pages/chatbots";
import ChatbotEditor from "@/pages/chatbot-editor";
import KnowledgeBase from "@/pages/knowledge-base";
import EmbedPage from "@/pages/embed";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import ChatbotPreview from "@/pages/chatbot-preview";
import ChatbotTest from "@/pages/chatbot-test";
import Landing from "@/pages/landing";
import ElevenLabsPage from "@/pages/elevenlabs";
import AuthPage from "@/pages/auth";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/chatbots" component={Chatbots} />
      <Route path="/chatbots/:id/preview" component={ChatbotPreview} />
      <Route path="/chatbots/:id/test" component={ChatbotTest} />
      <Route path="/chatbots/:id" component={ChatbotEditor} />
      <Route path="/knowledge-base" component={KnowledgeBase} />
      <Route path="/embed" component={EmbedPage} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/elevenlabs" component={ElevenLabsPage} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { user } = useAuth();
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const initials = user?.firstName && user?.lastName 
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "U";

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-50 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <NotificationsBell />
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-user-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "Usuario"} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="flex items-center gap-2" disabled>
                    <User className="h-4 w-4" />
                    <span>{user?.email || "Usuario"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    data-testid="button-logout"
                    className="flex items-center gap-2 text-destructive cursor-pointer"
                    onClick={() => {
                      localStorage.removeItem("authToken");
                      window.location.href = "/api/logout";
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="chatbot-platform-theme">
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
