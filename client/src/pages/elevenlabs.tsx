import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Mic, Upload, RefreshCw, Trash2, FileText, Loader2, Volume2, Play, CheckCircle, AlertCircle, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface Voice {
  id: string;
  name: string;
  category: string;
  previewUrl?: string;
}

interface AgentConfig {
  agentId: string;
  name: string;
  voice: string | null;
  firstMessage: string | null;
  systemPrompt: string | null;
}

interface KBDocument {
  id: string;
  name: string;
  type: string;
}

export default function ElevenLabsPage() {
  const { toast } = useToast();
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [firstMessage, setFirstMessage] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);

  const { data: config } = useQuery<{ enabled: boolean; agentId: string | null }>({
    queryKey: ["/api/elevenlabs/config"],
  });

  const { data: voices, isLoading: loadingVoices } = useQuery<Voice[]>({
    queryKey: ["/api/elevenlabs/voices"],
    enabled: !!config?.enabled,
  });

  const { data: agent, isLoading: loadingAgent } = useQuery<AgentConfig>({
    queryKey: ["/api/elevenlabs/agent"],
    enabled: !!config?.enabled,
  });

  const { data: knowledgeBase, isLoading: loadingKB, refetch: refetchKB } = useQuery<KBDocument[]>({
    queryKey: ["/api/elevenlabs/knowledge-base"],
    enabled: !!config?.enabled,
  });

  useEffect(() => {
    if (agent) {
      setSelectedVoice(agent.voice || "");
      setFirstMessage(agent.firstMessage || "");
      setSystemPrompt(agent.systemPrompt || "");
    }
  }, [agent]);

  const updateAgentMutation = useMutation({
    mutationFn: async (data: { voiceId?: string; firstMessage?: string; systemPrompt?: string }) => {
      return apiRequest("PATCH", "/api/elevenlabs/agent", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elevenlabs/agent"] });
      toast({ title: "Agente actualizado", description: "La configuración se ha guardado correctamente" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo actualizar el agente", variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/elevenlabs/knowledge-base/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      refetchKB();
      toast({ title: "Archivo subido", description: "El documento se agregó al knowledge base de ElevenLabs" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo subir el archivo", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      return apiRequest("DELETE", `/api/elevenlabs/knowledge-base/${docId}`);
    },
    onSuccess: () => {
      refetchKB();
      toast({ title: "Documento eliminado" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar el documento", variant: "destructive" });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const kbRes = await fetch("/api/knowledge-base");
      if (!kbRes.ok) throw new Error("Failed to fetch local KB");
      const localKB = await kbRes.json();
      
      const combinedContent = localKB
        .map((item: { title: string; content: string }) => `## ${item.title}\n\n${item.content}`)
        .join("\n\n---\n\n");
      
      if (!combinedContent.trim()) {
        throw new Error("No hay contenido en el knowledge base local");
      }
      
      return apiRequest("POST", "/api/elevenlabs/knowledge-base/sync", { content: combinedContent, filename: "local_knowledge_base.txt" });
    },
    onSuccess: () => {
      refetchKB();
      toast({ title: "Sincronizado", description: "El knowledge base local se ha sincronizado con ElevenLabs" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err instanceof Error ? err.message : "No se pudo sincronizar", variant: "destructive" });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
    e.target.value = "";
  };

  const playPreview = async (voice: Voice) => {
    if (!voice.previewUrl) return;
    
    setPlayingVoice(voice.id);
    const audio = new Audio(voice.previewUrl);
    audio.onended = () => setPlayingVoice(null);
    audio.onerror = () => setPlayingVoice(null);
    await audio.play();
  };

  if (!config?.enabled) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-semibold">ElevenLabs Voice AI</h1>
          <p className="text-muted-foreground">Configura la voz de tu agente de IA</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">ElevenLabs no configurado</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Para habilitar las funciones de voz, configura las variables de entorno ELEVENLABS_API_KEY y ELEVENLABS_AGENT_ID en tu proyecto.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold">ElevenLabs Voice AI</h1>
        <p className="text-muted-foreground">Configura la voz y el conocimiento de tu agente de IA</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Configuración de Voz
            </CardTitle>
            <CardDescription>Selecciona la voz y personaliza tu agente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Voz del Agente</Label>
              {loadingVoices ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando voces...
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger data-testid="select-voice">
                      <SelectValue placeholder="Selecciona una voz" />
                    </SelectTrigger>
                    <SelectContent>
                      {voices?.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          <div className="flex items-center gap-2">
                            <span>{voice.name}</span>
                            <span className="text-xs text-muted-foreground">({voice.category})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedVoice && voices?.find(v => v.id === selectedVoice)?.previewUrl && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const voice = voices?.find(v => v.id === selectedVoice);
                        if (voice) playPreview(voice);
                      }}
                      disabled={playingVoice === selectedVoice}
                      data-testid="button-preview-voice"
                    >
                      {playingVoice === selectedVoice ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <Label htmlFor="first-message">Mensaje Inicial</Label>
              <Textarea
                id="first-message"
                value={firstMessage}
                onChange={(e) => setFirstMessage(e.target.value)}
                placeholder="¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?"
                className="min-h-[80px]"
                data-testid="input-first-message"
              />
              <p className="text-xs text-muted-foreground">
                Este es el mensaje que el agente dirá al iniciar la conversación.
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="system-prompt">Instrucciones del Sistema</Label>
              <Textarea
                id="system-prompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Eres un asistente amable y profesional..."
                className="min-h-[120px]"
                data-testid="input-system-prompt"
              />
              <p className="text-xs text-muted-foreground">
                Define la personalidad y comportamiento del agente.
              </p>
            </div>

            <Button
              onClick={() => updateAgentMutation.mutate({ 
                voiceId: selectedVoice || undefined, 
                firstMessage: firstMessage || undefined, 
                systemPrompt: systemPrompt || undefined 
              })}
              disabled={updateAgentMutation.isPending}
              className="w-full"
              data-testid="button-save-agent"
            >
              {updateAgentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Guardar Configuración
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Knowledge Base de ElevenLabs
            </CardTitle>
            <CardDescription>
              Documentos que el agente de voz puede usar para responder
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => document.getElementById("elevenlabs-file-upload")?.click()}
                disabled={uploadMutation.isPending}
                className="flex-1"
                data-testid="button-upload-document"
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Subir Documento
              </Button>
              <input
                id="elevenlabs-file-upload"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="flex-1"
                data-testid="button-sync-kb"
              >
                {syncMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sincronizar KB Local
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Sube archivos directamente o sincroniza el knowledge base local de tus chatbots con ElevenLabs.
            </p>

            <Separator />

            <div className="space-y-2">
              <Label>Documentos Cargados</Label>
              {loadingKB ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando documentos...
                </div>
              ) : knowledgeBase && knowledgeBase.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {knowledgeBase.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.type}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(doc.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-doc-${doc.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay documentos en el knowledge base</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {agent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Estado del Agente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium">Activo</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-sm text-muted-foreground">
                ID: {agent.agentId}
              </span>
              {agent.name && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="text-sm text-muted-foreground">
                    Nombre: {agent.name}
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
