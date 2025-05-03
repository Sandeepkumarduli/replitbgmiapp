import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Trophy } from "lucide-react";
import { format } from "date-fns";
import { Tournament } from "@shared/schema";

type TournamentFormProps = {
  tournament?: Tournament;
  isEditing?: boolean;
};

const mapTypes = ["Erangel", "Miramar", "Sanhok", "Vikendi"];
const teamTypes = ["Solo", "Duo", "Squad"];
const gameTypes = ["BGMI", "FREEFIRE", "COD"];

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  date: z.date(),
  gameType: z.string().refine((val) => gameTypes.includes(val), "Please select a valid game"),
  mapType: z.string().refine((val) => mapTypes.includes(val), "Please select a valid map"),
  teamType: z.string().refine((val) => teamTypes.includes(val), "Please select a valid team type"),
  isPaid: z.boolean(),
  entryFee: z.number().min(0).optional(),
  prizePool: z.number().min(0),
  totalSlots: z.number().min(10).max(100),
  status: z.string(),
  roomId: z.string().optional(),
  password: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

export function TournamentForm({ tournament, isEditing = false }: TournamentFormProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditing && tournament 
      ? {
          title: tournament.title,
          description: tournament.description,
          date: new Date(tournament.date),
          gameType: tournament.gameType || "BGMI",
          mapType: tournament.mapType,
          teamType: tournament.teamType,
          isPaid: tournament.isPaid,
          entryFee: tournament.entryFee || 0,
          prizePool: tournament.prizePool || 0,
          totalSlots: tournament.totalSlots,
          status: tournament.status,
          roomId: tournament.roomId || "",
          password: tournament.password || ""
        }
      : {
          title: "",
          description: "",
          date: new Date(),
          gameType: "BGMI",
          mapType: "Erangel",
          teamType: "Squad",
          isPaid: false,
          entryFee: 0,
          prizePool: 0,
          totalSlots: 100,
          status: "upcoming",
          roomId: "",
          password: ""
        }
  });

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const url = isEditing ? `/api/tournaments/${tournament?.id}` : "/api/tournaments";
      const method = isEditing ? "PATCH" : "POST";
      
      console.log(`Making ${method} request to ${url} with data:`, values);
      
      // Create a type with optional id for our data and a date that can be string
      type DataToSend = Omit<FormValues, 'date'> & { date: string; id?: number };
      
      const dataToSend: DataToSend = {
        ...values,
        // Convert date to ISO string format
        date: values.date instanceof Date ? values.date.toISOString() : String(values.date),
      };
      
      // For PATCH requests, we need to include the id in the request body
      if (isEditing && tournament) {
        dataToSend.id = tournament.id;
      }
      
      const res = await apiRequest(method, url, dataToSend);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Tournament updated" : "Tournament created",
        description: isEditing 
          ? "The tournament has been updated successfully" 
          : "The tournament has been created successfully",
        variant: "default",
      });
      navigate("/admin/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: isEditing ? "Failed to update tournament" : "Failed to create tournament",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  function onSubmit(values: FormValues) {
    // Add extra validation for live tournaments
    if (isEditing && values.status === 'live') {
      if (!values.roomId || !values.password) {
        toast({
          title: "Validation Error",
          description: "Room ID and Password are required for live tournaments",
          variant: "destructive"
        });
        return;
      }
    }
    
    // Log the form submission for debugging
    console.log("Submitting tournament form:", {
      isEditing,
      tournamentId: tournament?.id,
      values,
    });
    
    createMutation.mutateAsync(values)
      .then(() => {
        console.log("Tournament form submission successful");
      })
      .catch((error) => {
        console.error("Tournament form submission failed:", error);
      });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Tournament Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter tournament title" 
                      className="bg-dark-surface border-gray-700 text-white"
                      {...field} 
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
                      placeholder="Enter tournament description" 
                      className="bg-dark-surface border-gray-700 text-white min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-white">Tournament Date & Time</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="bg-dark-surface border-gray-700 text-white w-full pl-3 text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            (() => {
                              try {
                                return format(new Date(field.value), "PPP p");
                              } catch (error) {
                                console.error("Invalid date format:", error);
                                return <span>Pick a date</span>;
                              }
                            })()
                          ) : (
                            <span>Pick a date</span>
                          )}
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
                      <div className="p-3 border-t border-gray-700">
                        <Input
                          type="time"
                          className="bg-dark-surface border-gray-700 text-white"
                          onChange={(e) => {
                            try {
                              const [hours, minutes] = e.target.value.split(':');
                              const newDate = new Date(field.value || new Date());
                              newDate.setHours(parseInt(hours || "0"), parseInt(minutes || "0"));
                              field.onChange(newDate);
                            } catch (error) {
                              console.error("Error setting time:", error);
                            }
                          }}
                          value={(() => {
                            try {
                              return field.value ? format(new Date(field.value), "HH:mm") : "00:00";
                            } catch (error) {
                              console.error("Invalid time format:", error);
                              return "00:00";
                            }
                          })()}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-6">
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
                    <SelectContent className="bg-dark-card border-gray-700">
                      {gameTypes.map((game) => (
                        <SelectItem key={game} value={game} className="text-white focus:bg-dark-surface focus:text-white">
                          {game}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
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
                      <SelectContent className="bg-dark-card border-gray-700">
                        {mapTypes.map((map) => (
                          <SelectItem key={map} value={map} className="text-white focus:bg-dark-surface focus:text-white">
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
                name="teamType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Team Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-dark-surface border-gray-700 text-white">
                          <SelectValue placeholder="Select team type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-dark-card border-gray-700">
                        {teamTypes.map((type) => (
                          <SelectItem key={type} value={type} className="text-white focus:bg-dark-surface focus:text-white">
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

            <FormField
              control={form.control}
              name="isPaid"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between p-3 border border-gray-700 rounded-md bg-dark-surface">
                  <div className="space-y-0.5">
                    <FormLabel className="text-white">Paid Tournament</FormLabel>
                    <FormDescription className="text-gray-400 text-xs">
                      Toggle if this is a paid tournament
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-primary"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("isPaid") && (
              <FormField
                control={form.control}
                name="entryFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Entry Fee (₹)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        className="bg-dark-surface border-gray-700 text-white"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="prizePool"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Prize Pool (₹)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      className="bg-dark-surface border-gray-700 text-white"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="totalSlots"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Total Slots</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="100" 
                      className="bg-dark-surface border-gray-700 text-white"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      min={10}
                      max={100}
                    />
                  </FormControl>
                  <FormDescription className="text-gray-400 text-xs">
                    Number of teams that can participate (10-100)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEditing && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-dark-surface border-gray-700 text-white">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-dark-card border-gray-700">
                        <SelectItem value="upcoming" className="text-white focus:bg-dark-surface focus:text-white">
                          Upcoming
                        </SelectItem>
                        <SelectItem value="live" className="text-white focus:bg-dark-surface focus:text-white">
                          Live
                        </SelectItem>
                        <SelectItem value="completed" className="text-white focus:bg-dark-surface focus:text-white">
                          Completed
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>

        {isEditing && (
          <div className="space-y-4 bg-dark-surface border border-gray-700 rounded-md p-4">
            <h3 className="text-white font-medium">Room Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="roomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Room ID</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter room ID" 
                        className="bg-dark-card border-gray-700 text-white"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription className="text-gray-400 text-xs">
                      Add this before the tournament starts
                    </FormDescription>
                    {form.watch("status") === "live" && !field.value && (
                      <p className="text-red-500 text-xs mt-1">
                        Room ID is required for live tournaments
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Room Password</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter room password" 
                        className="bg-dark-card border-gray-700 text-white"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription className="text-gray-400 text-xs">
                      Add this before the tournament starts
                    </FormDescription>
                    {form.watch("status") === "live" && !field.value && (
                      <p className="text-red-500 text-xs mt-1">
                        Room Password is required for live tournaments
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            className="border-gray-700 text-white hover:bg-dark-surface"
            onClick={() => navigate("/admin/dashboard")}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="bg-primary hover:bg-primary/90 text-white glow-hover"
            disabled={createMutation.isPending}
          >
            <Trophy className="w-4 h-4 mr-2" />
            {createMutation.isPending 
              ? (isEditing ? "Updating..." : "Creating...") 
              : (isEditing ? "Update Tournament" : "Create Tournament")
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}
