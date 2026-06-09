import { useState, useRef } from "react";
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
import { ArrowLeft, Save, Eye, Upload, X, ImageIcon, Mic, Play, UserCheck, MessageSquare, Wrench } from "lucide-react";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChatWidget } from "@/components/chat-widget";
import { ElevenLabsSettings } from "@/components/elevenlabs-settings";
import { PredefinedResponses } from "@/components/predefined-responses";
import { ELEVENLABS_VOICE_ENABLED } from "@/lib/features";
import type { Chatbot } from "@shared/schema";

const chatbotFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(100),
  description: z.string().max(1500).optional(),
  systemPrompt: z.string().max(100000).optional(),
  aiModel: z.string(),
  aiProvider: z.string(),
  customEndpoint: z.string().optional(),
  customApiKey: z.string().optional(),
  customModelName: z.string().optional(),
  openaiApiKey: z.string().optional(),
  geminiApiKey: z.string().optional(),
  embeddingProvider: z.string().optional(),
  embeddingModel: z.string().optional(),
  embeddingDimensions: z.coerce.number().min(1).max(1536).optional(),
  embeddingBaseUrl: z.string().optional(),
  primaryColor: z.string(),
  textColor: z.string(),
  position: z.string(),
  welcomeMessage: z.string().max(3000).optional(),
  temperature: z.string(),
  maxTokens: z.coerce.number().min(100).max(8192),
  isActive: z.boolean(),
  avatarImage: z.string().nullable().optional(),
  elevenLabsAgentId: z.string().optional(),
  requireLeadCapture: z.boolean().optional(),
  leadCaptureFields: z.string().optional(),
});

type ChatbotFormValues = z.infer<typeof chatbotFormSchema>;

type ModelCatalogItem = {
  id: string;
  label: string;
  provider: string;
  type: "chat" | "embedding";
  dimensions?: number;
  isDefault?: boolean;
  notes?: string;
};

type CapabilityItem = {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  permission?: string | null;
  requiresConfirmation?: boolean | null;
  isActive?: boolean | null;
};

type ToolLogItem = {
  id: number;
  toolId?: string | null;
  status?: string | null;
  createdAt: string;
};

type CapabilitiesResponse = {
  skills: CapabilityItem[];
  tools: CapabilityItem[];
  enabledSkillIds: string[];
  enabledToolIds: string[];
  recentToolLogs: ToolLogItem[];
};

const AI_MODELS = [
  // Modelos GRATUITOS (OpenRouter)
  { value: "deepseek/deepseek-r1-0528:free", label: "DeepSeek R1 (Gratis)", provider: "openrouter" },
  { value: "qwen/qwen3-coder:free", label: "Qwen 3 Coder (Gratis)", provider: "openrouter" },
  { value: "moonshotai/kimi-k2:free", label: "Kimi K2 (Gratis)", provider: "openrouter" },
  { value: "google/gemma-3n-e4b-it:free", label: "Gemma 3N E4B (Gratis)", provider: "openrouter" },
  { value: "nvidia/nemotron-nano-9b-v2:free", label: "Nemotron Nano 9B (Gratis)", provider: "openrouter" },
  { value: "openai/gpt-oss-20b:free", label: "GPT OSS 20B (Gratis)", provider: "openrouter" },
  // OpenAI (Premium)
  { value: "gpt-5.5", label: "GPT-5.5", provider: "openai" },
  { value: "gpt-5.4", label: "GPT-5.4", provider: "openai" },
  { value: "gpt-5.4-mini", label: "GPT-5.4 Mini (Rápido)", provider: "openai" },
  { value: "gpt-5.3-codex", label: "GPT-5.3 Codex", provider: "openai" },
  { value: "gpt-5.2", label: "GPT-5.2", provider: "openai" },
  { value: "gpt-5", label: "GPT-5 (Premium)", provider: "openai" },
  { value: "gpt-5.1", label: "GPT-5.1", provider: "openai" },
  { value: "gpt-4o", label: "GPT-4o", provider: "openai" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini (Rápido)", provider: "openai" },
  // Gemini (Premium)
  { value: "gemini-3-pro-preview", label: "Gemini 3 Pro", provider: "gemini" },
  { value: "gemini-3-flash-preview", label: "Gemini 3 Flash", provider: "gemini" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "gemini" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Rápido)", provider: "gemini" },
  // Personalizado
  { value: "custom", label: "Modelo Personalizado (Self-Hosted)", provider: "custom" },
];

const EMBEDDING_MODELS = [
  { value: "text-embedding-3-small", label: "OpenAI text-embedding-3-small", provider: "openai", dimensions: 1536 },
  { value: "text-embedding-3-large", label: "OpenAI text-embedding-3-large a 1536 dims", provider: "openai", dimensions: 1536 },
  { value: "nomic-embed-text", label: "Ollama nomic-embed-text", provider: "ollama", dimensions: 1536 },
  { value: "all-minilm:l6-v2", label: "Ollama all-minilm:l6-v2", provider: "ollama", dimensions: 1536 },
];

const POSITIONS = [
  { value: "bottom-right", label: "Abajo Derecha" },
  { value: "bottom-left", label: "Abajo Izquierda" },
  { value: "top-right", label: "Arriba Derecha" },
  { value: "top-left", label: "Arriba Izquierda" },
];

const DEFAULT_DESCRIPTION =
  "Asistente virtual institucional del DIF Zapopan para orientar a la ciudadania sobre tramites, servicios, programas, talleres y apoyos disponibles. Ayuda a encontrar el servicio correcto, muestra opciones por tema o grupo de atencion y permite consultar informacion por apartados como requisitos, costos, horarios, lugar y contacto.";

const DEFAULT_WELCOME_MESSAGE = `Hola, soy SofIA, asistente virtual del DIF Zapopan.

Puedo orientarte sobre tramites, servicios, programas, talleres y apoyos disponibles.

Puedes usarme asi:

1. Escribe el tramite o servicio que buscas.
   Ejemplo: platicas prematrimoniales, INAPAM, ayuda alimentaria.

2. Pide un listado por tema o grupo de atencion.
   Ejemplo: servicios para personas mayores, apoyos alimentarios, talleres deportivos.

3. Cuando elijas un servicio, puedo mostrarte solo el apartado que necesitas:
   requisitos, costos, horarios, lugar y contacto, o ficha completa.

Elige una opcion o escribe tu pregunta:

1. Buscar un tramite o servicio
2. No se que necesito
3. Ver por grupo de atencion
4. Ver programas o talleres`;

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

  const { data: modelCatalog } = useQuery<ModelCatalogItem[]>({
    queryKey: ["/api/model-catalog"],
  });

  const { data: capabilities } = useQuery<CapabilitiesResponse>({
    queryKey: ["/api/chatbots", chatbotId, "capabilities"],
    enabled: !isNew && !!chatbotId,
  });

  const chatModels = modelCatalog?.filter((model) => model.type === "chat") || AI_MODELS.map((model) => ({
    id: model.value,
    label: model.label,
    provider: model.provider,
    type: "chat" as const,
  }));

  const embeddingModels = modelCatalog?.filter((model) => model.type === "embedding") || EMBEDDING_MODELS.map((model) => ({
    id: model.value,
    label: model.label,
    provider: model.provider,
    type: "embedding" as const,
    dimensions: model.dimensions,
  }));

  const form = useForm<ChatbotFormValues>({
    resolver: zodResolver(chatbotFormSchema),
    defaultValues: {
      name: "",
      description: DEFAULT_DESCRIPTION,
      systemPrompt: "Eres un asistente útil.",
      aiModel: "gpt-5",
      aiProvider: "openai",
      customEndpoint: "",
      customApiKey: "",
      customModelName: "",
      openaiApiKey: "",
      geminiApiKey: "",
      embeddingProvider: "openai",
      embeddingModel: "text-embedding-3-small",
      embeddingDimensions: 1536,
      embeddingBaseUrl: "",
      primaryColor: "#3B82F6",
      textColor: "#FFFFFF",
      position: "bottom-right",
      welcomeMessage: DEFAULT_WELCOME_MESSAGE,
      temperature: "0.7",
      maxTokens: 1024,
      isActive: true,
      avatarImage: null,
      elevenLabsAgentId: "",
      requireLeadCapture: false,
      leadCaptureFields: "name,email",
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
      openaiApiKey: (chatbot as any).openaiApiKey || "",
      geminiApiKey: (chatbot as any).geminiApiKey || "",
      embeddingProvider: (chatbot as any).embeddingProvider || "openai",
      embeddingModel: (chatbot as any).embeddingModel || "text-embedding-3-small",
      embeddingDimensions: (chatbot as any).embeddingDimensions || 1536,
      embeddingBaseUrl: (chatbot as any).embeddingBaseUrl || "",
      primaryColor: chatbot.primaryColor || "#3B82F6",
      textColor: chatbot.textColor || "#FFFFFF",
      position: chatbot.position || "bottom-right",
      welcomeMessage: chatbot.welcomeMessage || DEFAULT_WELCOME_MESSAGE,
      temperature: chatbot.temperature || "0.7",
      maxTokens: chatbot.maxTokens || 1024,
      isActive: chatbot.isActive ?? true,
      avatarImage: chatbot.avatarImage || null,
      elevenLabsAgentId: chatbot.elevenLabsAgentId || "",
      requireLeadCapture: chatbot.requireLeadCapture ?? false,
      leadCaptureFields: chatbot.leadCaptureFields || "name,email",
    } : undefined,
  });

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await fetch(`/api/chatbots/${chatbotId}/avatar`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload avatar');
      }
      return response.json();
    },
    onSuccess: (data) => {
      form.setValue('avatarImage', data.avatarImage);
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots", chatbotId] });
      toast({
        title: "Imagen actualizada",
        description: "La imagen del chatbot se ha actualizado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo subir la imagen. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  const deleteAvatarMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/chatbots/${chatbotId}/avatar`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete avatar');
      }
      return response.json();
    },
    onSuccess: () => {
      form.setValue('avatarImage', null);
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots", chatbotId] });
      toast({
        title: "Imagen eliminada",
        description: "La imagen del chatbot se ha eliminado.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la imagen.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Archivo muy grande",
          description: "La imagen no puede ser mayor a 5MB.",
          variant: "destructive",
        });
        return;
      }
      uploadAvatarMutation.mutate(file);
    }
  };

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

  const capabilitiesMutation = useMutation({
    mutationFn: async (data: { skillIds: string[]; toolIds: string[] }) => {
      const response = await apiRequest("PATCH", `/api/chatbots/${chatbotId}/capabilities`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots", chatbotId, "capabilities"] });
      toast({
        title: "Capacidades actualizadas",
        description: "Skills y tools del chatbot guardadas.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudieron actualizar las capacidades.",
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

  const toggleSkill = (skillId: string) => {
    if (!capabilities || !chatbotId) return;
    const skillIds = capabilities.enabledSkillIds.includes(skillId)
      ? capabilities.enabledSkillIds.filter((id) => id !== skillId)
      : [...capabilities.enabledSkillIds, skillId];
    capabilitiesMutation.mutate({ skillIds, toolIds: capabilities.enabledToolIds });
  };

  const toggleTool = (toolId: string) => {
    if (!capabilities || !chatbotId) return;
    const toolIds = capabilities.enabledToolIds.includes(toolId)
      ? capabilities.enabledToolIds.filter((id) => id !== toolId)
      : [...capabilities.enabledToolIds, toolId];
    capabilitiesMutation.mutate({ skillIds: capabilities.enabledSkillIds, toolIds });
  };

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
        {!isNew && chatbotId && (
          <Button variant="outline" asChild data-testid="button-test-live">
            <Link href={`/chatbots/${chatbotId}/test`}>
              <Play className="mr-2 h-4 w-4" />
              Probar en Vivo
            </Link>
          </Button>
        )}
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
                <TabsList className="w-full flex-wrap">
                  <TabsTrigger value="basic" className="flex-1" data-testid="tab-basic">Básico</TabsTrigger>
                  <TabsTrigger value="ai" className="flex-1" data-testid="tab-ai">IA</TabsTrigger>
                  <TabsTrigger value="appearance" className="flex-1" data-testid="tab-appearance">Apariencia</TabsTrigger>
                  <TabsTrigger value="leads" className="flex-1" data-testid="tab-leads">
                    <UserCheck className="mr-1 h-3 w-3" />
                    Leads
                  </TabsTrigger>
                  <TabsTrigger value="responses" className="flex-1" data-testid="tab-responses">
                    <MessageSquare className="mr-1 h-3 w-3" />
                    Respuestas
                  </TabsTrigger>
                  <TabsTrigger value="capabilities" className="flex-1" data-testid="tab-capabilities">
                    <Wrench className="mr-1 h-3 w-3" />
                    Skills
                  </TabsTrigger>
                  {ELEVENLABS_VOICE_ENABLED && (
                    <TabsTrigger value="voice" className="flex-1" data-testid="tab-voice">
                      <Mic className="mr-1 h-3 w-3" />
                      Voz
                    </TabsTrigger>
                  )}
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
                                placeholder={DEFAULT_DESCRIPTION}
                                className="resize-none"
                                {...field}
                                data-testid="input-description"
                              />
                            </FormControl>
                            <FormDescription>
                              Describe el alcance del asistente. Maximo 1500 caracteres.
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
                                placeholder={DEFAULT_WELCOME_MESSAGE}
                                className="resize-none"
                                {...field}
                                data-testid="input-welcome"
                              />
                            </FormControl>
                            <FormDescription>
                              Primer mensaje que se muestra al abrir el chat. Maximo 3000 caracteres.
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
                                const selectedModel = chatModels.find(m => m.id === value);
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
                                <div className="px-2 py-1.5 text-xs font-semibold text-green-600 dark:text-green-400">Modelos Gratuitos</div>
                                {chatModels.filter(m => m.provider === "openrouter").map((model) => (
                                  <SelectItem key={model.id} value={model.id}>
                                    {model.label}
                                  </SelectItem>
                                ))}
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">OpenAI (Premium)</div>
                                {chatModels.filter(m => m.provider === "openai").map((model) => (
                                  <SelectItem key={model.id} value={model.id}>
                                    {model.label}
                                  </SelectItem>
                                ))}
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Google Gemini (Premium)</div>
                                {chatModels.filter(m => m.provider === "gemini").map((model) => (
                                  <SelectItem key={model.id} value={model.id}>
                                    {model.label}
                                  </SelectItem>
                                ))}
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Modelo Propio</div>
                                {chatModels.filter(m => m.provider === "custom").map((model) => (
                                  <SelectItem key={model.id} value={model.id}>
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

                      {watchedValues.aiProvider === "openai" && (
                        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                          <div className="text-sm font-medium text-muted-foreground mb-2">
                            API Key de OpenAI (Opcional)
                          </div>
                          <FormField
                            control={form.control}
                            name="openaiApiKey"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tu API Key de OpenAI</FormLabel>
                                <FormControl>
                                  <Input
                                    type="password"
                                    placeholder="sk-..."
                                    {...field}
                                    data-testid="input-openai-api-key"
                                  />
                                </FormControl>
                                <FormDescription>
                                  Si proporcionas tu propia API key, se usará en lugar de la configuración global del servidor. Obtén tu key en platform.openai.com
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      {watchedValues.aiProvider === "gemini" && (
                        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                          <div className="text-sm font-medium text-muted-foreground mb-2">
                            API Key de Google Gemini (Opcional)
                          </div>
                          <FormField
                            control={form.control}
                            name="geminiApiKey"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tu API Key de Gemini</FormLabel>
                                <FormControl>
                                  <Input
                                    type="password"
                                    placeholder="AIza..."
                                    {...field}
                                    data-testid="input-gemini-api-key"
                                  />
                                </FormControl>
                                <FormDescription>
                                  Si proporcionas tu propia API key, se usará en lugar de la configuración global del servidor. Obtén tu key en aistudio.google.com
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
                        <div>
                          <div className="text-sm font-medium">Embeddings para base de conocimiento</div>
                          <p className="text-sm text-muted-foreground">
                            Define como se generan los vectores RAG al cargar documentos. La base actual usa 1536 dimensiones.
                          </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="embeddingProvider"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Proveedor de embedding</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || "openai"}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-embedding-provider">
                                      <SelectValue placeholder="Selecciona proveedor" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="openai">OpenAI</SelectItem>
                                    <SelectItem value="ollama">Ollama</SelectItem>
                                    <SelectItem value="chatbot">Proveedor del chatbot</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="embeddingModel"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Modelo de embedding</FormLabel>
                                <Select
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    const selectedEmbedding = embeddingModels.find((model) => model.id === value);
                                    if (selectedEmbedding) {
                                      form.setValue("embeddingProvider", selectedEmbedding.provider);
                                      form.setValue("embeddingDimensions", selectedEmbedding.dimensions || 1536);
                                    }
                                  }}
                                  value={field.value || "text-embedding-3-small"}
                                >
                                  <FormControl>
                                    <SelectTrigger data-testid="select-embedding-model">
                                      <SelectValue placeholder="Selecciona modelo de embedding" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">OpenAI</div>
                                    {embeddingModels.filter(model => model.provider === "openai").map((model) => (
                                      <SelectItem key={model.id} value={model.id}>
                                        {model.label}
                                      </SelectItem>
                                    ))}
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Ollama</div>
                                    {embeddingModels.filter(model => model.provider === "ollama").map((model) => (
                                      <SelectItem key={model.id} value={model.id}>
                                        {model.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="embeddingDimensions"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Dimensiones</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} data-testid="input-embedding-dimensions" />
                                </FormControl>
                                <FormDescription>
                                  Mantener 1536 para compatibilidad con pgvector actual.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="embeddingBaseUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Base URL Ollama</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="http://192.168.8.82:11434"
                                    {...field}
                                    data-testid="input-embedding-base-url"
                                  />
                                </FormControl>
                                <FormDescription>
                                  Solo aplica si el proveedor es Ollama.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

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
                              Instrucciones que definen la personalidad y comportamiento del chatbot (máx. 100,000 caracteres)
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

                      <div className="space-y-2">
                        <FormLabel>Imagen del Avatar</FormLabel>
                        <FormDescription>
                          Personaliza la imagen que aparece junto a los mensajes del chatbot
                        </FormDescription>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          data-testid="input-avatar-file"
                        />
                        <div className="flex items-center gap-4">
                          {watchedValues.avatarImage ? (
                            <div className="relative">
                              <img
                                src={watchedValues.avatarImage}
                                alt="Avatar del chatbot"
                                className="h-20 w-20 rounded-full object-cover border-2"
                                style={{ borderColor: watchedValues.primaryColor || "#3B82F6" }}
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6"
                                onClick={() => deleteAvatarMutation.mutate()}
                                disabled={deleteAvatarMutation.isPending || isNew}
                                data-testid="button-delete-avatar"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div
                              className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed"
                              style={{ borderColor: watchedValues.primaryColor || "#3B82F6" }}
                            >
                              <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex flex-col gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploadAvatarMutation.isPending || isNew}
                              data-testid="button-upload-avatar"
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              {uploadAvatarMutation.isPending ? "Subiendo..." : "Subir Imagen"}
                            </Button>
                            {isNew && (
                              <p className="text-xs text-muted-foreground">
                                Guarda el chatbot primero para subir una imagen
                              </p>
                            )}
                            {!isNew && (
                              <p className="text-xs text-muted-foreground">
                                JPG, PNG, GIF o WebP. Máximo 5MB
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="leads" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5" />
                        Captura de Leads
                      </CardTitle>
                      <CardDescription>
                        Solicita información de contacto antes de iniciar la conversación
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="requireLeadCapture"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Activar captura de datos</FormLabel>
                              <FormDescription>
                                Muestra un formulario antes de iniciar el chat
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-lead-capture"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      {form.watch("requireLeadCapture") && (
                        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                          <div className="space-y-2">
                            <FormLabel>Campos a solicitar</FormLabel>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { id: "name", label: "Nombre" },
                                { id: "email", label: "Email" },
                                { id: "phone", label: "Teléfono" },
                                { id: "company", label: "Empresa" },
                              ].map((field) => {
                                const currentFields = form.watch("leadCaptureFields")?.split(",") || [];
                                const isChecked = currentFields.includes(field.id);
                                return (
                                  <label
                                    key={field.id}
                                    className="flex items-center gap-2 p-3 bg-background rounded-md border cursor-pointer hover-elevate"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const newFields = e.target.checked
                                          ? [...currentFields, field.id]
                                          : currentFields.filter((f) => f !== field.id);
                                        form.setValue("leadCaptureFields", newFields.join(","));
                                      }}
                                      className="rounded"
                                      data-testid={`checkbox-lead-${field.id}`}
                                    />
                                    <span className="text-sm">{field.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="responses" className="mt-4 space-y-4">
                  {!isNew && chatbotId && (
                    <PredefinedResponses chatbotId={chatbotId} />
                  )}
                  {isNew && (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center text-muted-foreground">
                          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          <p>Guarda el chatbot primero para configurar respuestas predefinidas</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="capabilities" className="mt-4 space-y-4">
                  {isNew && (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center text-muted-foreground">
                          <Wrench className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          <p>Guarda el chatbot primero para configurar skills y tools.</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {!isNew && capabilities && (
                    <>
                      <Card>
                        <CardHeader>
                          <CardTitle>Skills del agente</CardTitle>
                          <CardDescription>
                            Reglas de comportamiento habilitadas para este chatbot.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {capabilities.skills.map((skill) => (
                            <div key={skill.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                              <div>
                                <p className="font-medium">{skill.name}</p>
                                <p className="text-sm text-muted-foreground">{skill.description}</p>
                                <p className="mt-1 text-xs text-muted-foreground">Categoria: {skill.category || "general"}</p>
                              </div>
                              <Switch
                                checked={capabilities.enabledSkillIds.includes(skill.id)}
                                onCheckedChange={() => toggleSkill(skill.id)}
                                disabled={capabilitiesMutation.isPending}
                                data-testid={`switch-skill-${skill.id}`}
                              />
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Tools disponibles</CardTitle>
                          <CardDescription>
                            Acciones controladas que el agente puede usar o solicitar. Las sensibles requieren confirmacion.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {capabilities.tools.map((tool) => (
                            <div key={tool.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                              <div>
                                <p className="font-medium">{tool.name}</p>
                                <p className="text-sm text-muted-foreground">{tool.description}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Permiso: {tool.permission || "read"} · Confirmacion: {tool.requiresConfirmation ? "si" : "no"}
                                </p>
                              </div>
                              <Switch
                                checked={capabilities.enabledToolIds.includes(tool.id)}
                                onCheckedChange={() => toggleTool(tool.id)}
                                disabled={capabilitiesMutation.isPending}
                                data-testid={`switch-tool-${tool.id}`}
                              />
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Auditoria reciente</CardTitle>
                          <CardDescription>Ultimas ejecuciones registradas de tools.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {capabilities.recentToolLogs.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Aun no hay ejecuciones registradas.</p>
                          ) : (
                            <div className="space-y-2">
                              {capabilities.recentToolLogs.map((log) => (
                                <div key={log.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                                  <span>{log.toolId}</span>
                                  <span className="text-muted-foreground">{log.status}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  )}
                </TabsContent>

                {ELEVENLABS_VOICE_ENABLED && (
                  <TabsContent value="voice" className="mt-4 space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Mic className="h-5 w-5" />
                          Configuración de Voz
                        </CardTitle>
                        <CardDescription>
                          Configura un agente de ElevenLabs para habilitar conversaciones por voz en este chatbot
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="elevenLabsAgentId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ElevenLabs Agent ID</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="ej: abc123xyz..."
                                  {...field}
                                  data-testid="input-elevenlabs-agent-id"
                                />
                              </FormControl>
                              <FormDescription>
                                Ingresa el ID del agente de ElevenLabs para este chatbot. 
                                Puedes obtenerlo desde el panel de ElevenLabs Conversational AI.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {form.watch("elevenLabsAgentId") && (
                          <div className="p-3 bg-muted rounded-md">
                            <p className="text-sm text-muted-foreground">
                              El botón de voz aparecerá en el widget cuando el agente esté configurado correctamente.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    {!isNew && chatbotId && (
                      <ElevenLabsSettings chatbotId={chatbotId} />
                    )}
                  </TabsContent>
                )}
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
                    customEndpoint: watchedValues.customEndpoint || null,
                    customApiKey: watchedValues.customApiKey || null,
                    customModelName: watchedValues.customModelName || null,
                    openaiApiKey: watchedValues.openaiApiKey || null,
                    geminiApiKey: watchedValues.geminiApiKey || null,
                    embeddingProvider: watchedValues.embeddingProvider || "openai",
                    embeddingModel: watchedValues.embeddingModel || "text-embedding-3-small",
                    embeddingDimensions: watchedValues.embeddingDimensions || 1536,
                    embeddingBaseUrl: watchedValues.embeddingBaseUrl || null,
                    primaryColor: watchedValues.primaryColor || "#3B82F6",
                    textColor: watchedValues.textColor || "#FFFFFF",
                    position: watchedValues.position || "bottom-right",
                    welcomeMessage: watchedValues.welcomeMessage || DEFAULT_WELCOME_MESSAGE,
                    temperature: watchedValues.temperature || "0.7",
                    maxTokens: watchedValues.maxTokens || 1024,
                    isActive: watchedValues.isActive ?? true,
                    avatarImage: watchedValues.avatarImage || null,
                    elevenLabsAgentId: watchedValues.elevenLabsAgentId || null,
                    requireLeadCapture: watchedValues.requireLeadCapture ?? false,
                    leadCaptureFields: watchedValues.leadCaptureFields || "name,email",
                    userId: chatbot?.userId || null,
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
