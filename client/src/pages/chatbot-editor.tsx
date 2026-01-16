import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, Save, Eye, Bot } from "lucide-react";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChatWidget } from "@/components/chat-widget";
import type { Chatbot } from "@shared/schema";

const chatbotFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().max(2000).optional(),
  aiModel: z.string(),
  aiProvider: z.string(),
  primaryColor: z.string(),
  textColor: z.string(),
  position: z.string(),
  welcomeMessage: z.string().max(500).optional(),
  temperature: z.string(),
  maxTokens: z.coerce.number().min(100).max(8192),
  isActive: z.boolean(),
});

type ChatbotFormValues = z.infer<typeof chatbotFormSchema>;

const AI_MODELS = [
  { value: "gpt-5", label: "GPT-5 (Latest)", provider: "openai" },
  { value: "gpt-5.1", label: "GPT-5.1", provider: "openai" },
  { value: "gpt-4o", label: "GPT-4o", provider: "openai" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini (Fast)", provider: "openai" },
];

const POSITIONS = [
  { value: "bottom-right", label: "Bottom Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "top-right", label: "Top Right" },
  { value: "top-left", label: "Top Left" },
];

export default function ChatbotEditor() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/chatbots/:id");
  const isNew = params?.id === "new";
  const chatbotId = isNew ? null : parseInt(params?.id || "0");

  const { data: chatbot, isLoading } = useQuery<Chatbot>({
    queryKey: ["/api/chatbots", chatbotId],
    enabled: !isNew && !!chatbotId,
  });

  const form = useForm<ChatbotFormValues>({
    resolver: zodResolver(chatbotFormSchema),
    defaultValues: {
      name: "",
      description: "",
      systemPrompt: "You are a helpful assistant.",
      aiModel: "gpt-5",
      aiProvider: "openai",
      primaryColor: "#3B82F6",
      textColor: "#FFFFFF",
      position: "bottom-right",
      welcomeMessage: "Hello! How can I help you today?",
      temperature: "0.7",
      maxTokens: 1024,
      isActive: true,
    },
    values: chatbot ? {
      name: chatbot.name,
      description: chatbot.description || "",
      systemPrompt: chatbot.systemPrompt || "You are a helpful assistant.",
      aiModel: chatbot.aiModel || "gpt-5",
      aiProvider: chatbot.aiProvider || "openai",
      primaryColor: chatbot.primaryColor || "#3B82F6",
      textColor: chatbot.textColor || "#FFFFFF",
      position: chatbot.position || "bottom-right",
      welcomeMessage: chatbot.welcomeMessage || "Hello! How can I help you today?",
      temperature: chatbot.temperature || "0.7",
      maxTokens: chatbot.maxTokens || 1024,
      isActive: chatbot.isActive ?? true,
    } : undefined,
  });

  const createMutation = useMutation({
    mutationFn: async (data: ChatbotFormValues) => {
      const response = await apiRequest("POST", "/api/chatbots", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots"] });
      toast({
        title: "Chatbot created",
        description: "Your chatbot has been created successfully.",
      });
      setLocation(`/chatbots/${data.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create chatbot. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ChatbotFormValues) => {
      const response = await apiRequest("PATCH", `/api/chatbots/${chatbotId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots", chatbotId] });
      toast({
        title: "Chatbot updated",
        description: "Your changes have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update chatbot. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ChatbotFormValues) => {
    if (isNew) {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
  };

  const watchedValues = form.watch();

  if (!isNew && isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild data-testid="button-back">
          <Link href="/chatbots">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-semibold">
            {isNew ? "Create Chatbot" : "Edit Chatbot"}
          </h1>
          <p className="text-muted-foreground">
            {isNew ? "Configure your new AI chatbot" : `Editing ${chatbot?.name}`}
          </p>
        </div>
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={createMutation.isPending || updateMutation.isPending}
          data-testid="button-save"
        >
          <Save className="mr-2 h-4 w-4" />
          {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="basic" className="flex-1" data-testid="tab-basic">Basic</TabsTrigger>
                  <TabsTrigger value="ai" className="flex-1" data-testid="tab-ai">AI Settings</TabsTrigger>
                  <TabsTrigger value="appearance" className="flex-1" data-testid="tab-appearance">Appearance</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Basic Information</CardTitle>
                      <CardDescription>Set up the basic details of your chatbot</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="My Chatbot" {...field} data-testid="input-name" />
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
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="A helpful assistant for..."
                                className="resize-none"
                                {...field}
                                data-testid="input-description"
                              />
                            </FormControl>
                            <FormDescription>
                              Brief description of what this chatbot does
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="welcomeMessage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Welcome Message</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Hello! How can I help you today?"
                                className="resize-none"
                                {...field}
                                data-testid="input-welcome"
                              />
                            </FormControl>
                            <FormDescription>
                              First message shown when the chat opens
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Active</FormLabel>
                              <FormDescription>
                                Enable or disable this chatbot
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-active"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="ai" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>AI Configuration</CardTitle>
                      <CardDescription>Configure the AI model and behavior</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="aiModel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>AI Model</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-model">
                                  <SelectValue placeholder="Select a model" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {AI_MODELS.map((model) => (
                                  <SelectItem key={model.value} value={model.value}>
                                    {model.label}
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
                        name="systemPrompt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>System Prompt</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="You are a helpful assistant..."
                                className="min-h-32 resize-none"
                                {...field}
                                data-testid="input-system-prompt"
                              />
                            </FormControl>
                            <FormDescription>
                              Instructions that define your chatbot's personality and behavior
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="temperature"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Temperature: {field.value}</FormLabel>
                            <FormControl>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={field.value}
                                onChange={field.onChange}
                                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                data-testid="input-temperature"
                              />
                            </FormControl>
                            <FormDescription>
                              Lower values make responses more focused, higher values more creative
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maxTokens"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Tokens</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} data-testid="input-max-tokens" />
                            </FormControl>
                            <FormDescription>
                              Maximum length of responses (100-8192)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="appearance" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Appearance</CardTitle>
                      <CardDescription>Customize how your chatbot looks</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="primaryColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Color</FormLabel>
                            <div className="flex items-center gap-3">
                              <FormControl>
                                <Input
                                  type="color"
                                  className="h-10 w-20 p-1 cursor-pointer"
                                  {...field}
                                  data-testid="input-primary-color"
                                />
                              </FormControl>
                              <Input
                                value={field.value}
                                onChange={field.onChange}
                                className="flex-1"
                                placeholder="#3B82F6"
                              />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="textColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Text Color</FormLabel>
                            <div className="flex items-center gap-3">
                              <FormControl>
                                <Input
                                  type="color"
                                  className="h-10 w-20 p-1 cursor-pointer"
                                  {...field}
                                  data-testid="input-text-color"
                                />
                              </FormControl>
                              <Input
                                value={field.value}
                                onChange={field.onChange}
                                className="flex-1"
                                placeholder="#FFFFFF"
                              />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="position"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Widget Position</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-position">
                                  <SelectValue placeholder="Select position" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {POSITIONS.map((pos) => (
                                  <SelectItem key={pos.value} value={pos.value}>
                                    {pos.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Where the chat widget appears on your website
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </form>
          </Form>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Preview</CardTitle>
                <CardDescription>See how your chatbot will look</CardDescription>
              </div>
              <Eye className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="relative h-[500px] rounded-lg border bg-muted/30 overflow-hidden">
                <ChatWidget
                  chatbot={{
                    id: chatbotId || 0,
                    name: watchedValues.name || "My Chatbot",
                    description: watchedValues.description || null,
                    systemPrompt: watchedValues.systemPrompt || "You are a helpful assistant.",
                    aiModel: watchedValues.aiModel || "gpt-5",
                    aiProvider: watchedValues.aiProvider || "openai",
                    primaryColor: watchedValues.primaryColor || "#3B82F6",
                    textColor: watchedValues.textColor || "#FFFFFF",
                    position: watchedValues.position || "bottom-right",
                    welcomeMessage: watchedValues.welcomeMessage || "Hello! How can I help you today?",
                    temperature: watchedValues.temperature || "0.7",
                    maxTokens: watchedValues.maxTokens || 1024,
                    isActive: watchedValues.isActive ?? true,
                    createdAt: new Date(),
                  }}
                  isPreview
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
