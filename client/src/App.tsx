import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./lib/auth";
import Navbar from "./components/navigation/navbar";

// Pages
import Home from "@/pages/home";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
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

function Router() {
  const [location] = useLocation();
  
  const showNavbar = !location.startsWith("/login") && 
                     !location.startsWith("/signup") && 
                     !location.startsWith("/admin/login") && 
                     !location.startsWith("/admin/signup");
  
  return (
    <div className="min-h-screen bg-dark font-poppins">
      {showNavbar && <Navbar />}
      
      <div className="pt-16">
        <Switch>
          <Route path="/" component={Home}/>
          <Route path="/login" component={Login}/>
          <Route path="/signup" component={Signup}/>
          <Route path="/admin/login" component={AdminLogin}/>
          <Route path="/admin/signup" component={AdminSignup}/>
          <Route path="/admin/dashboard" component={AdminDashboard}/>
          <Route path="/admin/tournaments/create" component={CreateTournament}/>
          <Route path="/admin/tournaments/edit/:id" component={EditTournament}/>
          <Route path="/user/dashboard" component={UserDashboard}/>
          <Route path="/user/profile" component={UserProfile}/>
          <Route path="/user/team" component={UserTeam}/>
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
