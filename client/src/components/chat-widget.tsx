import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, X, Send, Bot, User, Loader2 } from "lucide-react";
import type { Chatbot } from "@shared/schema";
import { cn } from "@/lib/utils";
import { VoiceChat } from "./voice-chat";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatWidgetProps {
  chatbot: Chatbot;
  isPreview?: boolean;
}

export function ChatWidget({ chatbot, isPreview = false }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(isPreview);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: chatbot.welcomeMessage || "¡Hola! ¿En qué puedo ayudarte?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isPreview) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: chatbot.welcomeMessage || "¡Hola! ¿En qué puedo ayudarte?",
        },
      ]);
    }
  }, [chatbot.welcomeMessage, isPreview]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    if (isPreview) {
      setTimeout(() => {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Este es el modo vista previa. La respuesta real vendrá de la IA cuando se despliegue.",
        };
        setMessages((prev) => [...prev, botMessage]);
        setIsLoading(false);
      }, 1000);
      return;
    }

    try {
      let sessionId = localStorage.getItem(`chatbot-${chatbot.id}-session`);
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem(`chatbot-${chatbot.id}-session`, sessionId);
      }

      const response = await fetch(`/api/widget/${chatbot.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId,
        }),
      });

      if (!response.ok) throw new Error("Error al enviar mensaje");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No hay lector disponible");

      const botMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        { id: botMessageId, role: "assistant", content: "" },
      ]);

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botMessageId
                      ? { ...m, content: m.content + data.content }
                      : m
                  )
                );
              }
            } catch (e) {
              // Ignorar errores de parseo
            }
          }
        }
      }
    } catch (error) {
      console.error("Error de chat:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Lo siento, encontré un error. Por favor, inténtalo de nuevo.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const positionClasses = {
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
  };

  const position = (chatbot.position || "bottom-right") as keyof typeof positionClasses;

  if (!isOpen && !isPreview) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95",
          positionClasses[position]
        )}
        style={{ backgroundColor: chatbot.primaryColor || "#3B82F6" }}
        data-testid="button-open-chat"
      >
        <MessageSquare className="h-6 w-6" style={{ color: chatbot.textColor || "#FFFFFF" }} />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl shadow-2xl overflow-hidden",
        isPreview ? "absolute inset-4" : cn("fixed z-50 w-96 h-[600px]", positionClasses[position])
      )}
      style={{ backgroundColor: "var(--background)" }}
      data-testid="chat-widget"
    >
      <div
        className="flex items-center justify-between p-4"
        style={{ backgroundColor: chatbot.primaryColor || "#3B82F6" }}
      >
        <div className="flex items-center gap-3">
          {chatbot.avatarImage ? (
            <img
              src={chatbot.avatarImage}
              alt={chatbot.name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <Bot className="h-5 w-5" style={{ color: chatbot.textColor || "#FFFFFF" }} />
            </div>
          )}
          <div>
            <h3 className="font-semibold" style={{ color: chatbot.textColor || "#FFFFFF" }}>
              {chatbot.name || "Chatbot"}
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-400"></span>
              <span className="text-xs opacity-80" style={{ color: chatbot.textColor || "#FFFFFF" }}>
                En línea
              </span>
            </div>
          </div>
        </div>
        {!isPreview && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="text-white/80 hover:text-white hover:bg-white/10"
            data-testid="button-close-chat"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                chatbot.avatarImage ? (
                  <img
                    src={chatbot.avatarImage}
                    alt={chatbot.name}
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: chatbot.primaryColor || "#3B82F6" }}
                  >
                    <Bot className="h-4 w-4" style={{ color: chatbot.textColor || "#FFFFFF" }} />
                  </div>
                )
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5",
                  message.role === "user"
                    ? "rounded-tr-sm"
                    : "rounded-tl-sm bg-muted"
                )}
                style={
                  message.role === "user"
                    ? {
                        backgroundColor: chatbot.primaryColor || "#3B82F6",
                        color: chatbot.textColor || "#FFFFFF",
                      }
                    : undefined
                }
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              {chatbot.avatarImage ? (
                <img
                  src={chatbot.avatarImage}
                  alt={chatbot.name}
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: chatbot.primaryColor || "#3B82F6" }}
                >
                  <Bot className="h-4 w-4" style={{ color: chatbot.textColor || "#FFFFFF" }} />
                </div>
              )}
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Pensando...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe un mensaje..."
            disabled={isLoading}
            className="flex-1"
            data-testid="input-chat-message"
          />
          {!isPreview && (
            <VoiceChat
              primaryColor={chatbot.primaryColor}
              textColor={chatbot.textColor}
              onTranscript={(role, text) => {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: Date.now().toString(),
                    role,
                    content: text,
                  },
                ]);
              }}
            />
          )}
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            style={{ backgroundColor: chatbot.primaryColor || "#3B82F6" }}
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" style={{ color: chatbot.textColor || "#FFFFFF" }} />
          </Button>
        </form>
      </div>
    </div>
  );
}
