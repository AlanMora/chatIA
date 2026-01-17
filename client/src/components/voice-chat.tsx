import { useState, useCallback, useEffect } from "react";
import { useConversation } from "@elevenlabs/react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceChatProps {
  onTranscript?: (role: "user" | "assistant", text: string) => void;
  primaryColor?: string;
  textColor?: string;
  className?: string;
}

export function VoiceChat({ onTranscript, primaryColor, textColor, className }: VoiceChatProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const conversation = useConversation({
    onConnect: () => {
      setIsConnecting(false);
      setError(null);
    },
    onDisconnect: () => {
      setIsConnecting(false);
    },
    onMessage: (message) => {
      if (onTranscript && message.message) {
        const role = message.source === "user" ? "user" : "assistant";
        onTranscript(role, message.message);
      }
    },
    onError: (err) => {
      console.error("ElevenLabs error:", err);
      setError("Error en la conexión de voz");
      setIsConnecting(false);
    },
  });

  const startConversation = useCallback(async () => {
    if (!agentId) {
      setError("Configuración de voz no disponible");
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (micError) {
        throw new Error("Necesitas permitir acceso al micrófono");
      }

      const signedUrlResponse = await fetch("/api/elevenlabs/signed-url");
      if (!signedUrlResponse.ok) {
        if (signedUrlResponse.status === 503) {
          throw new Error("Servicio de voz no configurado");
        }
        throw new Error("No se pudo obtener la URL de conexión");
      }
      const data = await signedUrlResponse.json();
      const signedUrl = data.signed_url;

      if (!signedUrl) {
        throw new Error("URL de conexión no válida");
      }

      await conversation.startSession({
        signedUrl,
      });
    } catch (err) {
      console.error("Failed to start conversation:", err);
      setError(err instanceof Error ? err.message : "Error al iniciar la conversación");
      setIsConnecting(false);
    }
  }, [agentId, conversation]);

  const endConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      conversation.setVolume({ volume: 1 });
    } else {
      conversation.setVolume({ volume: 0 });
    }
    setIsMuted(!isMuted);
  }, [conversation, isMuted]);

  if (!agentId) {
    return null;
  }

  const isConnected = conversation.status === "connected";
  const isSpeaking = conversation.isSpeaking;

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
          disabled={isConnecting}
          className="relative"
          style={{ 
            borderColor: primaryColor || "#3B82F6",
            color: primaryColor || "#3B82F6"
          }}
          title="Iniciar conversación por voz"
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
