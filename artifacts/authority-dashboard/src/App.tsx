import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Reports from "@/pages/reports";
import Analytics from "@/pages/analytics";
import ReportDetail from "@/pages/report-detail";
import { Shield, LayoutDashboard, FileText, BarChart3, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { supabase } from "@/lib/supabase";

setAuthTokenGetter(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
});

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground text-sm">লোড হচ্ছে...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar — near-black per palette */}
      <div className="w-60 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border hidden md:flex flex-shrink-0">
        {/* Brand */}
        <div className="px-4 py-5 flex items-center gap-3 border-b border-sidebar-border">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground flex-shrink-0">
            <Shield size={18} />
          </div>
          <div>
            <div className="font-bold text-sidebar-foreground text-sm tracking-wide">নাগরিক সেবা</div>
            <div className="text-[10px] text-sidebar-foreground/40 mt-0.5">{user.departments?.name_bn || ''}</div>
          </div>
        </div>
        
        {/* Nav */}
        <div className="px-3 py-4 flex-1">
          <div className="text-[10px] font-semibold text-sidebar-foreground/30 mb-3 uppercase tracking-wider px-2">Navigation</div>
          <nav className="space-y-0.5">
            <NavItem href="/dashboard" icon={<LayoutDashboard size={16} />} label="Dashboard" />
            <NavItem href="/reports" icon={<FileText size={16} />} label="All Reports" />
            <NavItem href="/analytics" icon={<BarChart3 size={16} />} label="Analytics" />
          </nav>
        </div>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-sidebar-border">
          <div className="flex flex-col gap-1 mb-3 px-2">
            <div className="text-sm font-medium text-sidebar-foreground">{user.full_name}</div>
            <div className="text-xs text-sidebar-foreground/40">{user.departments?.name || ''}</div>
            <div className="mt-1">
              <span className="text-[10px] uppercase bg-sidebar-accent text-sidebar-accent-foreground/60 px-2 py-0.5 rounded border border-sidebar-border">{user.role}</span>
            </div>
          </div>
          <AuthLogoutButton />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <Component />
        </main>
      </div>
    </div>
  );
}

function NavItem({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
  const [location] = useLocation();
  const isActive = location === href || (href !== '/' && location.startsWith(`${href}`));
  
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors text-sm ${
        isActive 
          ? 'bg-primary/20 text-primary font-semibold' 
          : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      }`}
      data-testid={`nav-${label.toLowerCase()}`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function AuthLogoutButton() {
  const { logout } = useAuth();
  return (
    <button 
      onClick={logout} 
      className="flex items-center gap-2 text-sidebar-foreground/40 hover:text-sidebar-foreground text-sm transition-colors w-full px-2 py-1.5 rounded hover:bg-sidebar-accent"
      data-testid="button-logout"
    >
      <LogOut size={14} />
      <span>Sign out</span>
    </button>
  );
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/reports/:id"><ProtectedRoute component={ReportDetail} /></Route>
      <Route path="/reports"><ProtectedRoute component={Reports} /></Route>
      <Route path="/analytics"><ProtectedRoute component={Analytics} /></Route>
      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
