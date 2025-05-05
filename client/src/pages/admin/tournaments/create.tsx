import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import AdminLayout from "@/components/layouts/admin-layout";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, Trophy, Calendar as CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTournamentSchema, InsertTournament } from "@shared/schema";
import { format } from "date-fns";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Extend the tournament schema for the form
const tournamentFormSchema = insertTournamentSchema.extend({
  date: z.date({
    required_error: "A date is required",
  })
});

type TournamentFormValues = z.infer<typeof tournamentFormSchema>;

export default function CreateTournament() {
  const { isAdmin, isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Define game types, modes, and map types
  const gameTypes = ["BGMI", "COD", "FREEFIRE"];
  const gameModes = ["Solo", "Duo", "Squad"];
  const mapTypes = ["Erangel", "Miramar", "Sanhok", "Vikendi", "Livik"];

  // Get form with default values
  const form = useForm<TournamentFormValues>({
    resolver: zodResolver(tournamentFormSchema),
    defaultValues: {
      title: "",
      description: "",
      date: new Date(),
      mapType: "Erangel",
      gameMode: "Squad",
      teamType: "Squad", // This should match gameMode for consistency
      gameType: "BGMI",
      isPaid: false,
      entryFee: 0,
      prizePool: 0,
      totalSlots: 25,
      slots: 25, // This should match totalSlots for consistency
    },
  });

  // Update teamType when gameMode changes to maintain consistency
  const gameMode = form.watch("gameMode");
  useEffect(() => {
    form.setValue("teamType", gameMode);
  }, [gameMode, form]);

  // Update slots when totalSlots changes to maintain consistency
  const totalSlots = form.watch("totalSlots");
  useEffect(() => {
    form.setValue("slots", totalSlots);
  }, [totalSlots, form]);

  // Handle isPaid toggle to enable/disable entry fee field
  const isPaid = form.watch("isPaid");

  // Create tournament mutation
  const createTournamentMutation = useMutation({
    mutationFn: async (values: TournamentFormValues) => {
      const response = await apiRequest("POST", "/api/tournaments", values);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create tournament");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tournament created successfully",
        description: "The tournament has been created and is now available.",
      });
      navigate("/admin/tournaments");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create tournament",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Handle form submission
  function onSubmit(values: TournamentFormValues) {
    setIsSubmitting(true);
    createTournamentMutation.mutate(values);
  }

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

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/admin/tournaments")}
            className="mr-4 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <Trophy className="h-7 w-7 text-primary mr-3" />
            Create Tournament
          </h1>
        </div>

        <Card className="bg-dark-card border-gray-800 max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-white text-xl">Tournament Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Tournament Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter tournament title"
                          {...field}
                          className="bg-dark-surface border-gray-700 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter tournament description, rules, etc."
                          rows={4}
                          {...field}
                          className="bg-dark-surface border-gray-700 text-white resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-white">Tournament Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "pl-3 text-left font-normal bg-dark-surface border-gray-700 text-white",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-dark-card border-gray-700">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                              className="bg-dark-card text-white"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gameType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Game</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-dark-surface border-gray-700 text-white">
                              <SelectValue placeholder="Select game" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-dark-card border-gray-700 text-white">
                            {gameTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="gameMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Game Mode</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-dark-surface border-gray-700 text-white">
                              <SelectValue placeholder="Select mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-dark-card border-gray-700 text-white">
                            {gameModes.map((mode) => (
                              <SelectItem key={mode} value={mode}>
                                {mode}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mapType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Map</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-dark-surface border-gray-700 text-white">
                              <SelectValue placeholder="Select map" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-dark-card border-gray-700 text-white">
                            {mapTypes.map((map) => (
                              <SelectItem key={map} value={map}>
                                {map}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="totalSlots"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Slots</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                            className="bg-dark-surface border-gray-700 text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="isPaid"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-700 p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-white">Paid Tournament</FormLabel>
                          <div className="text-sm text-gray-400">
                            Toggle if this tournament requires an entry fee
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {isPaid && (
                    <FormField
                      control={form.control}
                      name="entryFee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Entry Fee (₹)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                              className="bg-dark-surface border-gray-700 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="prizePool"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Prize Pool (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                          className="bg-dark-surface border-gray-700 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4 space-x-4 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/admin/tournaments")}
                    className="border-gray-700 text-white hover:bg-dark-surface"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-primary hover:bg-primary/90 text-white"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Creating..." : "Create Tournament"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}