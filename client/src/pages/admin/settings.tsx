import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import AdminLayout from "@/components/layouts/admin-layout";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Shield, Database, Bell, Lock, Server, Save, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminSettings() {
  const { isAdmin, isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Settings states
  const [enableRegistration, setEnableRegistration] = useState(true);
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState("daily");
  const [maxTeamsPerTournament, setMaxTeamsPerTournament] = useState("100");
  const [defaultTournamentSlots, setDefaultTournamentSlots] = useState("100");
  const [websiteMaintenanceMode, setWebsiteMaintenanceMode] = useState(false);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      navigate("/auth");
    }
  }, [isAdmin, isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  const saveSettings = () => {
    // In a real application, this would save to backend
    toast({
      title: "Settings saved",
      description: "Your settings have been saved successfully",
    });
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <h1 className="text-3xl font-bold text-white mb-4 md:mb-0">System Settings</h1>
          <Button
            onClick={saveSettings}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="bg-dark-card mb-6 p-1 border border-gray-800">
            <TabsTrigger value="general" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              General
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              Security
            </TabsTrigger>
            <TabsTrigger value="database" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              Database
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card className="bg-dark-card border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Website Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="registration" className="text-white">User Registration</Label>
                    <p className="text-sm text-gray-400">Allow new users to sign up</p>
                  </div>
                  <Switch
                    id="registration"
                    checked={enableRegistration}
                    onCheckedChange={setEnableRegistration}
                  />
                </div>

                <Separator className="bg-gray-800" />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notifications" className="text-white">Email Notifications</Label>
                    <p className="text-sm text-gray-400">Send emails for tournament updates</p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={enableNotifications}
                    onCheckedChange={setEnableNotifications}
                  />
                </div>

                <Separator className="bg-gray-800" />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="maintenance" className="text-white">Maintenance Mode</Label>
                    <p className="text-sm text-gray-400">Temporarily disable the website</p>
                  </div>
                  <Switch
                    id="maintenance"
                    checked={websiteMaintenanceMode}
                    onCheckedChange={setWebsiteMaintenanceMode}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-dark-card border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Tournament Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <Label htmlFor="max-teams" className="text-white">Maximum Teams Per Tournament</Label>
                  <Input
                    id="max-teams"
                    type="number"
                    value={maxTeamsPerTournament}
                    onChange={(e) => setMaxTeamsPerTournament(e.target.value)}
                    className="bg-dark-surface border-gray-700 text-white"
                  />
                </div>

                <div className="grid gap-4">
                  <Label htmlFor="default-slots" className="text-white">Default Tournament Slots</Label>
                  <Input
                    id="default-slots"
                    type="number"
                    value={defaultTournamentSlots}
                    onChange={(e) => setDefaultTournamentSlots(e.target.value)}
                    className="bg-dark-surface border-gray-700 text-white"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="bg-dark-card border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Security Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <Label htmlFor="admin-ip" className="text-white">Allowed Admin IP Addresses</Label>
                  <Input
                    id="admin-ip"
                    placeholder="Enter comma-separated IP addresses"
                    className="bg-dark-surface border-gray-700 text-white"
                  />
                  <p className="text-sm text-gray-400">Leave empty to allow all IPs</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="database" className="space-y-6">
            <Card className="bg-dark-card border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Database Backup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <Label htmlFor="backup-frequency" className="text-white">Backup Frequency</Label>
                  <select
                    id="backup-frequency"
                    value={backupFrequency}
                    onChange={(e) => setBackupFrequency(e.target.value)}
                    className="bg-dark-surface border border-gray-700 rounded-md p-2 text-white"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    className="border-primary text-white hover:bg-dark-card"
                    onClick={() => {
                      toast({
                        title: "Backup Started",
                        description: "Database backup has been initiated",
                      });
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Manual Backup
                  </Button>
                  
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      toast({
                        title: "Reset Canceled",
                        description: "This feature is disabled in the demo",
                        variant: "destructive"
                      });
                    }}
                  >
                    <Server className="mr-2 h-4 w-4" />
                    Reset Database
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}