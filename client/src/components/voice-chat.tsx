import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, PhoneOff, Volume2, VolumeX, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceChatProps {
  onTranscript?: (role: "user" | "assistant", text: string) => void;
  primaryColor?: string;
  textColor?: string;
  className?: string;
}

export function VoiceChat({ onTranscript, primaryColor, textColor, className }: VoiceChatProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<any>(null);

  useEffect(() => {
    fetch("/api/elevenlabs/config")
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data?.enabled && data?.agentId) {
          setAgentId(data.agentId);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch ElevenLabs config:", err);
      });
  }, []);

  useEffect(() => {
    let conversationInstance: any = null;

    async function initConversation() {
      try {
        const { Conversation } = await import("@elevenlabs/client");
        conversationInstance = await Conversation.startSession({
          agentId: agentId!,
          connectionType: "websocket",
          onConnect: () => {
            setIsConnecting(false);
            setIsConnected(true);
            setError(null);
          },
          onDisconnect: () => {
            setIsConnected(false);
            setIsConnecting(false);
          },
          onMessage: (message: any) => {
            if (onTranscript && message.message) {
              const role = message.source === "user" ? "user" : "assistant";
              onTranscript(role, message.message);
            }
          },
          onModeChange: (mode: any) => {
            setIsSpeaking(mode.mode === "speaking");
          },
          onError: (err: any) => {
            console.error("ElevenLabs error:", err);
            setError("Error en la conexión de voz");
            setIsConnecting(false);
            setIsConnected(false);
          },
        });
        setConversation(conversationInstance);
      } catch (err) {
        console.error("Failed to start conversation:", err);
        setError(err instanceof Error ? err.message : "Error al iniciar la conversación");
        setIsConnecting(false);
      }
    }

    if (isConnecting && agentId) {
      initConversation();
    }

    return () => {
      if (conversationInstance) {
        conversationInstance.endSession();
      }
    };
  }, [isConnecting, agentId, onTranscript]);

  const startConversation = useCallback(async () => {
    if (!agentId) {
      setError("Configuración de voz no disponible");
      return;
    }

    try {
      setError(null);
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsConnecting(true);
    } catch (micError) {
      setError("Necesitas permitir acceso al micrófono");
    }
  }, [agentId]);

  const endConversation = useCallback(async () => {
    if (conversation) {
      await conversation.endSession();
      setConversation(null);
    }
    setIsConnected(false);
  }, [conversation]);

  const toggleMute = useCallback(() => {
    if (conversation) {
      if (isMuted) {
        conversation.setVolume({ volume: 1 });
      } else {
        conversation.setVolume({ volume: 0 });
      }
    }
    setIsMuted(!isMuted);
  }, [conversation, isMuted]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {error && (
        <span className="text-xs text-destructive mr-2">{error}</span>
      )}
      
      {!isConnected ? (
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={startConversation}
          disabled={isConnecting || !agentId}
          className="relative"
          style={{ 
            borderColor: primaryColor || "#3B82F6",
            color: primaryColor || "#3B82F6"
          }}
          title={agentId ? "Iniciar conversación por voz" : "Voz no configurada"}
          data-testid="button-start-voice"
        >
          {isConnecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
      ) : (
        <>
          <div 
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
              isSpeaking ? "bg-green-500/20 text-green-600" : "bg-blue-500/20 text-blue-600"
            )}
          >
            <span className={cn(
              "h-2 w-2 rounded-full",
              isSpeaking ? "bg-green-500 animate-pulse" : "bg-blue-500"
            )} />
            {isSpeaking ? "Hablando..." : "Escuchando..."}
          </div>
          
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={toggleMute}
            title={isMuted ? "Activar sonido" : "Silenciar"}
            data-testid="button-toggle-mute"
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            type="button"
            size="icon"
            variant="destructive"
            onClick={endConversation}
            title="Terminar llamada"
            data-testid="button-end-voice"
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
