import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./lib/auth";
import Navbar from "./components/navigation/navbar";
import Footer from "./components/navigation/footer";
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
import AdminTeams from "@/pages/admin/teams";
import AdminUsers from "@/pages/admin/users";
import AdminManagement from "@/pages/admin/admins";
import AdminUserDetails from "@/pages/admin/user-details";
import AdminSettings from "@/pages/admin/settings";
import AdminTournaments from "@/pages/admin/tournaments";
import UserDashboard from "@/pages/user/dashboard";
import UserProfile from "@/pages/user/profile";
import UserTeam from "@/pages/user/team";
import Tournaments from "@/pages/tournaments";
import TournamentDetails from "@/pages/tournament-details";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";

// Protected Routes Components
function ProtectedRoute({ component: Component, adminOnly = false, ...rest }: { 
  component: React.ComponentType<any>, 
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
        <Redirect to="/auth" />
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

  return <Route {...rest}>{(props) => <Component {...props} />}</Route>;
}

function AuthRoute({ component: Component, ...rest }: { 
  component: React.ComponentType<any>, 
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

  return <Route {...rest}>{(props) => <Component {...props} />}</Route>;
}

function Router() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  
  const showNavbar = !location.startsWith("/auth") && 
                     !location.startsWith("/forgot-password");
  
  const showFooter = !location.startsWith("/auth") && 
                     !location.startsWith("/forgot-password");
  
  return (
    <div className="min-h-screen bg-dark font-poppins flex flex-col">
      {showNavbar && <Navbar />}
      
      <div className="pt-16 flex-grow">
        <Switch>
          <Route path="/" component={Home}/>
          
          {/* Auth Routes - redirect to dashboard if already logged in */}
          <AuthRoute path="/auth" component={AuthPage}/>
          <AuthRoute path="/forgot-password" component={ForgotPassword}/>
          
          {/* Legacy routes - redirect to the unified auth page */}
          <Route path="/login">
            <Redirect to="/auth" />
          </Route>
          <Route path="/signup">
            <Redirect to="/auth" />
          </Route>
          <Route path="/admin/login">
            <Redirect to="/auth" />
          </Route>
          <Route path="/admin/signup">
            <Redirect to="/auth" />
          </Route>
          
          {/* Admin Routes - protected and admin only */}
          <ProtectedRoute path="/admin/dashboard" component={AdminDashboard} adminOnly={true}/>
          <ProtectedRoute path="/admin/tournaments" component={AdminTournaments} adminOnly={true}/>
          <ProtectedRoute path="/admin/tournaments/create" component={CreateTournament} adminOnly={true}/>
          <ProtectedRoute path="/admin/teams" component={AdminTeams} adminOnly={true}/>
          <ProtectedRoute path="/admin/users" component={AdminUsers} adminOnly={true}/>
          <ProtectedRoute path="/admin/users/:id" component={AdminUserDetails} adminOnly={true}/>
          <ProtectedRoute path="/admin/admins" component={AdminManagement} adminOnly={true}/>
          <ProtectedRoute path="/admin/settings" component={AdminSettings} adminOnly={true}/>
          <Route path="/admin/tournaments/edit/:id">
            {(params) => (
              isAuthenticated ? 
                <EditTournament params={params} /> : 
                <Redirect to="/auth" />
            )}
          </Route>
          
          {/* User Routes - protected */}
          <ProtectedRoute path="/user/dashboard" component={UserDashboard}/>
          <ProtectedRoute path="/user/profile" component={UserProfile}/>
          <ProtectedRoute path="/user/team" component={UserTeam}/>
          <ProtectedRoute path="/user/team/create" component={UserTeam}/>
          
          {/* Public Routes */}
          <Route path="/tournaments" component={Tournaments}/>
          <Route path="/tournaments/:id" component={TournamentDetails}/>
          <Route component={NotFound} />
        </Switch>
      </div>
      
      {showFooter && <Footer />}
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
