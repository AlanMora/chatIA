import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { ArrowLeft, Save, Eye } from "lucide-react";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChatWidget } from "@/components/chat-widget";
import type { Chatbot } from "@shared/schema";

const chatbotFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(100),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().max(2000).optional(),
  aiModel: z.string(),
  aiProvider: z.string(),
  customEndpoint: z.string().optional(),
  customApiKey: z.string().optional(),
  customModelName: z.string().optional(),
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
  { value: "gpt-5", label: "GPT-5 (Último)", provider: "openai" },
  { value: "gpt-5.1", label: "GPT-5.1", provider: "openai" },
  { value: "gpt-4o", label: "GPT-4o", provider: "openai" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini (Rápido)", provider: "openai" },
  { value: "gemini-3-pro-preview", label: "Gemini 3 Pro (Último)", provider: "gemini" },
  { value: "gemini-3-flash-preview", label: "Gemini 3 Flash", provider: "gemini" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "gemini" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Rápido)", provider: "gemini" },
  { value: "custom", label: "Modelo Personalizado (Self-Hosted)", provider: "custom" },
];

const POSITIONS = [
  { value: "bottom-right", label: "Abajo Derecha" },
  { value: "bottom-left", label: "Abajo Izquierda" },
  { value: "top-right", label: "Arriba Derecha" },
  { value: "top-left", label: "Arriba Izquierda" },
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
      systemPrompt: "Eres un asistente útil.",
      aiModel: "gpt-5",
      aiProvider: "openai",
      customEndpoint: "",
      customApiKey: "",
      customModelName: "",
      primaryColor: "#3B82F6",
      textColor: "#FFFFFF",
      position: "bottom-right",
      welcomeMessage: "¡Hola! ¿En qué puedo ayudarte?",
      temperature: "0.7",
      maxTokens: 1024,
      isActive: true,
    },
    values: chatbot ? {
      name: chatbot.name,
      description: chatbot.description || "",
      systemPrompt: chatbot.systemPrompt || "Eres un asistente útil.",
      aiModel: chatbot.aiModel || "gpt-5",
      aiProvider: chatbot.aiProvider || "openai",
      customEndpoint: chatbot.customEndpoint || "",
      customApiKey: chatbot.customApiKey || "",
      customModelName: chatbot.customModelName || "",
      primaryColor: chatbot.primaryColor || "#3B82F6",
      textColor: chatbot.textColor || "#FFFFFF",
      position: chatbot.position || "bottom-right",
      welcomeMessage: chatbot.welcomeMessage || "¡Hola! ¿En qué puedo ayudarte?",
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
        title: "Chatbot creado",
        description: "Tu chatbot ha sido creado correctamente.",
      });
      setLocation(`/chatbots/${data.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el chatbot. Inténtalo de nuevo.",
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
        title: "Chatbot actualizado",
        description: "Tus cambios han sido guardados.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el chatbot. Inténtalo de nuevo.",
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
            {isNew ? "Crear Chatbot" : "Editar Chatbot"}
          </h1>
          <p className="text-muted-foreground">
            {isNew ? "Configura tu nuevo chatbot de IA" : `Editando ${chatbot?.name}`}
          </p>
        </div>
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={createMutation.isPending || updateMutation.isPending}
          data-testid="button-save"
        >
          <Save className="mr-2 h-4 w-4" />
          {createMutation.isPending || updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="basic" className="flex-1" data-testid="tab-basic">Básico</TabsTrigger>
                  <TabsTrigger value="ai" className="flex-1" data-testid="tab-ai">Configuración IA</TabsTrigger>
                  <TabsTrigger value="appearance" className="flex-1" data-testid="tab-appearance">Apariencia</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Información Básica</CardTitle>
                      <CardDescription>Configura los detalles básicos de tu chatbot</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre</FormLabel>
                            <FormControl>
                              <Input placeholder="Mi Chatbot" {...field} data-testid="input-name" />
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
                            <FormLabel>Descripción</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Un asistente útil para..."
                                className="resize-none"
                                {...field}
                                data-testid="input-description"
                              />
                            </FormControl>
                            <FormDescription>
                              Breve descripción de lo que hace este chatbot
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
                            <FormLabel>Mensaje de Bienvenida</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="¡Hola! ¿En qué puedo ayudarte?"
                                className="resize-none"
                                {...field}
                                data-testid="input-welcome"
                              />
                            </FormControl>
                            <FormDescription>
                              Primer mensaje que se muestra al abrir el chat
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
                              <FormLabel>Activo</FormLabel>
                              <FormDescription>
                                Habilitar o deshabilitar este chatbot
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
                      <CardTitle>Configuración de IA</CardTitle>
                      <CardDescription>Configura el modelo de IA y su comportamiento</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="aiModel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Modelo de IA</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value);
                                const selectedModel = AI_MODELS.find(m => m.value === value);
                                if (selectedModel) {
                                  form.setValue("aiProvider", selectedModel.provider);
                                }
                              }} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-model">
                                  <SelectValue placeholder="Selecciona un modelo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">OpenAI</div>
                                {AI_MODELS.filter(m => m.provider === "openai").map((model) => (
                                  <SelectItem key={model.value} value={model.value}>
                                    {model.label}
                                  </SelectItem>
                                ))}
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Google Gemini</div>
                                {AI_MODELS.filter(m => m.provider === "gemini").map((model) => (
                                  <SelectItem key={model.value} value={model.value}>
                                    {model.label}
                                  </SelectItem>
                                ))}
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Modelo Propio</div>
                                {AI_MODELS.filter(m => m.provider === "custom").map((model) => (
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

                      {watchedValues.aiProvider === "custom" && (
                        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                          <div className="text-sm font-medium text-muted-foreground mb-2">
                            Configuración del Modelo Personalizado
                          </div>
                          <FormField
                            control={form.control}
                            name="customEndpoint"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>URL del Servidor</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="https://tu-servidor.com:8080/v1/chat/completions" 
                                    {...field} 
                                    data-testid="input-custom-endpoint"
                                  />
                                </FormControl>
                                <FormDescription>
                                  La URL completa del endpoint de tu modelo (compatible con API de OpenAI)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="customModelName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nombre del Modelo</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="llama3, mistral-7b, gpt-4, etc." 
                                    {...field} 
                                    data-testid="input-custom-model-name"
                                  />
                                </FormControl>
                                <FormDescription>
                                  El identificador del modelo en tu servidor
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="customApiKey"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>API Key (Opcional)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="password"
                                    placeholder="sk-..." 
                                    {...field} 
                                    data-testid="input-custom-api-key"
                                  />
                                </FormControl>
                                <FormDescription>
                                  Solo si tu servidor requiere autenticación
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      <FormField
                        control={form.control}
                        name="systemPrompt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prompt del Sistema</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Eres un asistente útil..."
                                className="min-h-32 resize-none"
                                {...field}
                                data-testid="input-system-prompt"
                              />
                            </FormControl>
                            <FormDescription>
                              Instrucciones que definen la personalidad y comportamiento del chatbot
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
                            <FormLabel>Temperatura: {field.value}</FormLabel>
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
                              Valores bajos = respuestas más enfocadas, valores altos = más creativos
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
                            <FormLabel>Tokens Máximos</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} data-testid="input-max-tokens" />
                            </FormControl>
                            <FormDescription>
                              Longitud máxima de las respuestas (100-8192)
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
                      <CardTitle>Apariencia</CardTitle>
                      <CardDescription>Personaliza cómo se ve tu chatbot</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="primaryColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Color Principal</FormLabel>
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
                            <FormLabel>Color del Texto</FormLabel>
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
                            <FormLabel>Posición del Widget</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-position">
                                  <SelectValue placeholder="Selecciona posición" />
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
                              Dónde aparecerá el widget de chat en tu sitio web
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
                <CardTitle>Vista Previa</CardTitle>
                <CardDescription>Así se verá tu chatbot</CardDescription>
              </div>
              <Eye className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="relative h-[500px] rounded-lg border bg-muted/30 overflow-hidden">
                <ChatWidget
                  chatbot={{
                    id: chatbotId || 0,
                    name: watchedValues.name || "Mi Chatbot",
                    description: watchedValues.description || null,
                    systemPrompt: watchedValues.systemPrompt || "Eres un asistente útil.",
                    aiModel: watchedValues.aiModel || "gpt-5",
                    aiProvider: watchedValues.aiProvider || "openai",
                    primaryColor: watchedValues.primaryColor || "#3B82F6",
                    textColor: watchedValues.textColor || "#FFFFFF",
                    position: watchedValues.position || "bottom-right",
                    welcomeMessage: watchedValues.welcomeMessage || "¡Hola! ¿En qué puedo ayudarte?",
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
