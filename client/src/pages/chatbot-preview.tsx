import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Chatbot } from "@shared/schema";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceChat } from "@/components/voice-chat";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ChatbotPreview() {
  const [, params] = useRoute("/chatbots/:id/preview");
  const chatbotId = parseInt(params?.id || "0");

  const { data: chatbot, isLoading } = useQuery<Chatbot>({
    queryKey: ["/api/chatbots", chatbotId],
    enabled: !!chatbotId,
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatbot) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: chatbot.welcomeMessage || "¡Hola! ¿En qué puedo ayudarte?",
        },
      ]);
    }
  }, [chatbot]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoadingChat || !chatbot) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoadingChat(true);

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
      setIsLoadingChat(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="flex-1 w-full" />
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <h2 className="text-xl font-semibold">Chatbot no encontrado</h2>
        <Button asChild className="mt-4">
          <Link href="/chatbots">Volver a Chatbots</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 p-4 border-b">
        <Button variant="ghost" size="icon" asChild data-testid="button-back">
          <Link href="/chatbots">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Prueba: {chatbot.name}</h1>
          <p className="text-sm text-muted-foreground">
            Chatea con tu bot para probar cómo responde usando la IA real
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/embed?chatbot=${chatbot.id}`}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Obtener Código
          </Link>
        </Button>
      </div>

      <div className="flex-1 flex justify-center p-6 bg-muted/30">
        <div 
          className="w-full max-w-md h-full flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{ backgroundColor: "var(--background)" }}
        >
          <div
            className="flex items-center gap-3 p-4"
            style={{ backgroundColor: chatbot.primaryColor || "#3B82F6" }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <Bot className="h-5 w-5" style={{ color: chatbot.textColor || "#FFFFFF" }} />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: chatbot.textColor || "#FFFFFF" }}>
                {chatbot.name}
              </h3>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-400"></span>
                <span className="text-xs opacity-80" style={{ color: chatbot.textColor || "#FFFFFF" }}>
                  En línea
                </span>
              </div>
            </div>
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
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: chatbot.primaryColor || "#3B82F6" }}
                    >
                      <Bot className="h-4 w-4" style={{ color: chatbot.textColor || "#FFFFFF" }} />
                    </div>
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
              {isLoadingChat && (
                <div className="flex gap-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: chatbot.primaryColor || "#3B82F6" }}
                  >
                    <Bot className="h-4 w-4" style={{ color: chatbot.textColor || "#FFFFFF" }} />
                  </div>
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
                disabled={isLoadingChat}
                className="flex-1"
                data-testid="input-preview-message"
              />
              <VoiceChat
                primaryColor={chatbot.primaryColor || "#3B82F6"}
                textColor={chatbot.textColor || "#FFFFFF"}
                onTranscript={(role, text) => {
                  setMessages((prev) => [
                    ...prev,
                    { id: Date.now().toString(), role, content: text },
                  ]);
                }}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoadingChat}
                style={{ backgroundColor: chatbot.primaryColor || "#3B82F6" }}
                data-testid="button-send-preview"
              >
                <Send className="h-4 w-4" style={{ color: chatbot.textColor || "#FFFFFF" }} />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
