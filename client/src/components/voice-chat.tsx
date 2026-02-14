import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, PhoneOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceChatProps {
  onTranscript?: (role: "user" | "assistant", text: string) => void;
  primaryColor?: string;
  textColor?: string;
  className?: string;
  agentId?: string | null;
}

type ConversationStatus = "idle" | "connecting" | "connected";

export function VoiceChat({ onTranscript, primaryColor, textColor, className, agentId: propAgentId }: VoiceChatProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ConversationStatus>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const conversationRef = useRef<any>(null);

  useEffect(() => {
    // If a specific agent ID is provided via props, use it directly
    if (propAgentId) {
      setAgentId(propAgentId);
      setIsEnabled(true);
      return;
    }

    // Otherwise fall back to global ElevenLabs config
    fetch("/api/elevenlabs/config")
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data?.enabled && data?.agentId) {
          setAgentId(data.agentId);
          setIsEnabled(true);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch ElevenLabs config:", err);
      });
  }, [propAgentId]);

  const startConversation = useCallback(async () => {
    if (!agentId) {
      setError("Configuración de voz no disponible");
      return;
    }

    try {
      setError(null);
      setStatus("connecting");
      
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const { Conversation } = await import("@elevenlabs/client");
      
      const conv = await Conversation.startSession({
        agentId,
        connectionType: "websocket",
        onConnect: () => {
          setStatus("connected");
          setError(null);
        },
        onDisconnect: () => {
          setStatus("idle");
          conversationRef.current = null;
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
          setStatus("idle");
        },
      });
      
      conversationRef.current = conv;
    } catch (err) {
      console.error("Failed to start voice:", err);
      setError(err instanceof Error ? err.message : "Error al iniciar voz");
      setStatus("idle");
    }
  }, [agentId, onTranscript]);

  const endConversation = useCallback(async () => {
    if (conversationRef.current) {
      await conversationRef.current.endSession();
      conversationRef.current = null;
    }
    setStatus("idle");
  }, []);

  if (!isEnabled) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {error && (
        <span className="text-xs text-destructive mr-2">{error}</span>
      )}
      
      {status !== "connected" ? (
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={startConversation}
          disabled={status === "connecting" || !agentId}
          className="relative"
          style={{ 
            borderColor: primaryColor || "#3B82F6",
            color: primaryColor || "#3B82F6"
          }}
          title={agentId ? "Iniciar conversación por voz" : "Voz no configurada"}
          data-testid="button-start-voice"
        >
          {status === "connecting" ? (
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
