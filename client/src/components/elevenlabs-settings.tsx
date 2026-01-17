import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Volume2, RefreshCw, CheckCircle2, AlertCircle, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface Voice {
  id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
  previewUrl?: string;
}

interface AgentInfo {
  agentId: string;
  name: string;
  voice: string | null;
  firstMessage: string | null;
  systemPrompt: string | null;
}

interface ElevenLabsSettingsProps {
  chatbotId: number;
}

export function ElevenLabsSettings({ chatbotId }: ElevenLabsSettingsProps) {
  const { toast } = useToast();
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const { data: config, isLoading: configLoading, isError: configError } = useQuery<{ agentId: string; enabled: boolean }>({
    queryKey: ["/api/elevenlabs/config"],
    retry: false,
  });

  const isEnabled = config?.enabled === true;

  const { data: voices, isLoading: voicesLoading } = useQuery<Voice[]>({
    queryKey: ["/api/elevenlabs/voices"],
    enabled: isEnabled,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: agent, isLoading: agentLoading } = useQuery<AgentInfo>({
    queryKey: ["/api/elevenlabs/agent"],
    enabled: isEnabled,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: knowledgeBase } = useQuery({
    queryKey: ["/api/knowledge-base", chatbotId],
    enabled: !!chatbotId,
  });

  useEffect(() => {
    if (agent?.voice && !selectedVoice) {
      setSelectedVoice(agent.voice);
    }
  }, [agent?.voice, selectedVoice]);

  const updateAgentMutation = useMutation({
    mutationFn: async (data: { voiceId?: string }) => {
      const response = await fetch("/api/elevenlabs/agent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update agent");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elevenlabs/agent"] });
      toast({
        title: "Voz actualizada",
        description: "La voz del agente ha sido cambiada exitosamente en ElevenLabs.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la voz. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  const syncKnowledgeBaseMutation = useMutation({
    mutationFn: async () => {
      if (!knowledgeBase || !Array.isArray(knowledgeBase) || knowledgeBase.length === 0) {
        throw new Error("No hay contenido en la base de conocimiento");
      }

      const consolidatedContent = knowledgeBase
        .map((item: { title: string; content: string }) => `## ${item.title}\n\n${item.content}`)
        .join("\n\n---\n\n");

      const response = await fetch("/api/elevenlabs/knowledge-base/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: consolidatedContent,
          filename: `chatbot_${chatbotId}_knowledge.txt`,
        }),
      });

      if (!response.ok) throw new Error("Failed to sync knowledge base");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Base de conocimiento sincronizada",
        description: "El contenido ha sido enviado a ElevenLabs exitosamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error de sincronización",
        description: error instanceof Error ? error.message : "No se pudo sincronizar la base de conocimiento.",
        variant: "destructive",
      });
    },
  });

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId);
  };

  const handleSaveVoice = () => {
    if (selectedVoice) {
      updateAgentMutation.mutate({ voiceId: selectedVoice });
    }
  };

  const handlePreviewVoice = (voice: Voice) => {
    if (!voice.previewUrl) return;

    if (previewAudio) {
      previewAudio.pause();
      setIsPlaying(false);
    }

    const audio = new Audio(voice.previewUrl);
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => setIsPlaying(false);
    audio.play();
    setPreviewAudio(audio);
    setIsPlaying(true);
  };

  const handleSyncKnowledgeBase = () => {
    syncKnowledgeBaseMutation.mutate();
  };

  if (configLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (configError || !isEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            ElevenLabs no configurado
          </CardTitle>
          <CardDescription>
            Para habilitar las conversaciones por voz, configura las credenciales de ElevenLabs en los secretos del proyecto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Necesitas añadir <code className="bg-muted px-1 rounded">ELEVENLABS_API_KEY</code> y{" "}
            <code className="bg-muted px-1 rounded">ELEVENLABS_AGENT_ID</code> en los secretos.
          </p>
        </CardContent>
      </Card>
    );
  }

  const kbItemCount = Array.isArray(knowledgeBase) ? knowledgeBase.length : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Configuración de Voz
          </CardTitle>
          <CardDescription>
            Configura la voz del agente de ElevenLabs para conversaciones por voz
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {agentLoading || voicesLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Cargando voces disponibles...</span>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Voz del Agente</label>
                <div className="flex gap-2">
                  <Select value={selectedVoice} onValueChange={handleVoiceChange}>
                    <SelectTrigger className="flex-1" data-testid="select-voice">
                      <SelectValue placeholder="Selecciona una voz" />
                    </SelectTrigger>
                    <SelectContent>
                      {voices?.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          <div className="flex items-center gap-2">
                            <span>{voice.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {voice.category}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedVoice && voices && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const voice = voices.find((v) => v.id === selectedVoice);
                        if (voice) handlePreviewVoice(voice);
                      }}
                      disabled={isPlaying}
                      title="Escuchar voz"
                      data-testid="button-preview-voice"
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Esta voz se usará cuando los usuarios hablen con el agente por voz
                </p>
              </div>

              <Button
                onClick={handleSaveVoice}
                disabled={!selectedVoice || updateAgentMutation.isPending || selectedVoice === agent?.voice}
                data-testid="button-save-voice"
              >
                {updateAgentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Guardar Voz
                  </>
                )}
              </Button>

              {agent && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Agente conectado:</strong> {agent.agentId}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Sincronizar Base de Conocimiento
          </CardTitle>
          <CardDescription>
            Envía el contenido de la base de conocimiento local a ElevenLabs para que el agente de voz pueda responder preguntas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm font-medium">Documentos locales</p>
              <p className="text-xs text-muted-foreground">
                {kbItemCount} {kbItemCount === 1 ? "documento" : "documentos"} en la base de conocimiento
              </p>
            </div>
            <Badge variant={kbItemCount > 0 ? "default" : "secondary"}>
              {kbItemCount > 0 ? "Listo para sincronizar" : "Sin contenido"}
            </Badge>
          </div>

          <Button
            onClick={handleSyncKnowledgeBase}
            disabled={kbItemCount === 0 || syncKnowledgeBaseMutation.isPending}
            className="w-full"
            data-testid="button-sync-kb"
          >
            {syncKnowledgeBaseMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sincronizar con ElevenLabs
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            Al sincronizar, todo el contenido de la base de conocimiento se enviará a ElevenLabs para que el agente de voz pueda responder preguntas basándose en esta información.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
