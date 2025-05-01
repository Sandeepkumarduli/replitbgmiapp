import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./lib/auth";
import Navbar from "./components/navigation/navbar";
import { Loader2 } from "lucide-react";

// Pages
import Home from "@/pages/home";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import ForgotPassword from "@/pages/forgot-password";
import AdminLogin from "@/pages/admin/login";
import AdminSignup from "@/pages/admin/signup";
import AdminDashboard from "@/pages/admin/dashboard";
import CreateTournament from "@/pages/admin/create-tournament";
import EditTournament from "@/pages/admin/edit-tournament";
import UserDashboard from "@/pages/user/dashboard";
import UserProfile from "@/pages/user/profile";
import UserTeam from "@/pages/user/team";
import Tournaments from "@/pages/tournaments";
import TournamentDetails from "@/pages/tournament-details";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";

// Protected Routes Components
function ProtectedRoute({ component: Component, adminOnly = false, ...rest }: { 
  component: React.ComponentType, 
  adminOnly?: boolean, 
  path?: string 
}) {
  const { user, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <Route {...rest}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route {...rest}>
        <Redirect to="/login" />
      </Route>
    );
  }

  if (adminOnly && !isAdmin) {
    return (
      <Route {...rest}>
        <Redirect to="/user/dashboard" />
      </Route>
    );
  }

  return <Route {...rest} component={Component} />;
}

function AuthRoute({ component: Component, ...rest }: { 
  component: React.ComponentType, 
  path?: string 
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route {...rest}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (user) {
    return (
      <Route {...rest}>
        <Redirect to={user.role === 'admin' ? '/admin/dashboard' : '/user/dashboard'} />
      </Route>
    );
  }

  return <Route {...rest} component={Component} />;
}

function Router() {
  const [location] = useLocation();
  
  const showNavbar = !location.startsWith("/login") && 
                     !location.startsWith("/signup") && 
                     !location.startsWith("/forgot-password") &&
                     !location.startsWith("/admin/login") && 
                     !location.startsWith("/admin/signup") &&
                     !location.startsWith("/auth");
  
  return (
    <div className="min-h-screen bg-dark font-poppins">
      {showNavbar && <Navbar />}
      
      <div className="pt-16">
        <Switch>
          <Route path="/" component={Home}/>
          
          {/* Auth Routes - redirect to dashboard if already logged in */}
          <AuthRoute path="/auth" component={AuthPage}/>
          <AuthRoute path="/login" component={Login}/>
          <AuthRoute path="/signup" component={Signup}/>
          <AuthRoute path="/forgot-password" component={ForgotPassword}/>
          <AuthRoute path="/admin/login" component={AdminLogin}/>
          <AuthRoute path="/admin/signup" component={AdminSignup}/>
          
          {/* Admin Routes - protected and admin only */}
          <ProtectedRoute path="/admin/dashboard" component={AdminDashboard} adminOnly={true}/>
          <ProtectedRoute path="/admin/tournaments/create" component={CreateTournament} adminOnly={true}/>
          <ProtectedRoute path="/admin/tournaments/edit/:id" component={EditTournament} adminOnly={true}/>
          
          {/* User Routes - protected */}
          <ProtectedRoute path="/user/dashboard" component={UserDashboard}/>
          <ProtectedRoute path="/user/profile" component={UserProfile}/>
          <ProtectedRoute path="/user/team" component={UserTeam}/>
          
          {/* Public Routes */}
          <Route path="/tournaments" component={Tournaments}/>
          <Route path="/tournaments/:id" component={TournamentDetails}/>
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
