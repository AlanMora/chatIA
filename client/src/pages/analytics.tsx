import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BarChart3, MessageSquare, Users, Clock, TrendingUp, Star, Download, Eye } from "lucide-react";
import { useState } from "react";
import type { Chatbot } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ChatMessageContent } from "@/components/chat-message-content";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AnalyticsStats {
  totalConversations: number;
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  conversationsToday: number;
  messagesToday: number;
}

interface Metrics {
  averageResponseTimeMs: number | null;
  averageRating: number | null;
}

interface DailyStats {
  date: string;
  conversations: number;
  messages: number;
}

interface Message {
  id: number;
  conversationId: number | null;
  role: string;
  content: string;
  responseTimeMs?: number | null;
  knowledgeStrategy?: "empty" | "full" | "vector" | "deterministic" | null;
  knowledgeSources?: string[] | null;
  knowledgeChunks?: number | null;
  createdAt: string;
}

interface ConversationWithMessages {
  conversation: {
    id: number;
    chatbotId: number | null;
    sessionId: string;
    createdAt: string;
  };
  messages: Message[];
  chatbotName: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--muted-foreground))'];

function getKnowledgeStrategyLabel(strategy?: Message["knowledgeStrategy"]) {
  switch (strategy) {
    case "vector":
      return "RAG vectorial";
    case "deterministic":
      return "Regla conversacional";
    case "full":
      return "Contexto completo";
    case "empty":
      return "Sin contexto";
    default:
      return null;
  }
}

function getLastAssistantMessage(messages: Message[]) {
  return [...messages].reverse().find((message) => message.role === "assistant");
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await apiRequest("GET", url);
  return response.json() as Promise<T>;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function asAnalyticsStats(value: unknown): AnalyticsStats {
  if (!value || typeof value !== "object") {
    return {
      totalConversations: 0,
      totalMessages: 0,
      userMessages: 0,
      assistantMessages: 0,
      conversationsToday: 0,
      messagesToday: 0,
    };
  }

  const stats = value as Partial<AnalyticsStats>;
  return {
    totalConversations: Number(stats.totalConversations) || 0,
    totalMessages: Number(stats.totalMessages) || 0,
    userMessages: Number(stats.userMessages) || 0,
    assistantMessages: Number(stats.assistantMessages) || 0,
    conversationsToday: Number(stats.conversationsToday) || 0,
    messagesToday: Number(stats.messagesToday) || 0,
  };
}

function asMetrics(value: unknown): Metrics {
  if (!value || typeof value !== "object") {
    return {
      averageResponseTimeMs: null,
      averageRating: null,
    };
  }

  const metrics = value as Partial<Metrics>;
  return {
    averageResponseTimeMs:
      typeof metrics.averageResponseTimeMs === "number" ? metrics.averageResponseTimeMs : null,
    averageRating:
      typeof metrics.averageRating === "number" ? metrics.averageRating : null,
  };
}

export default function Analytics() {
  const { toast } = useToast();
  const [selectedChatbot, setSelectedChatbot] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("7d");
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithMessages | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const getDaysFromRange = (range: string) => {
    switch (range) {
      case "24h": return 1;
      case "7d": return 7;
      case "30d": return 30;
      case "90d": return 90;
      default: return 7;
    }
  };

  const days = getDaysFromRange(timeRange);
  const chatbotIdParam = selectedChatbot !== "all" ? `&chatbotId=${selectedChatbot}` : "";

  const { data: chatbots, isLoading: chatbotsLoading } = useQuery<Chatbot[]>({
    queryKey: ["/api/chatbots"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<AnalyticsStats>({
    queryKey: ["/api/analytics/stats", selectedChatbot, days],
    queryFn: async () => {
      return asAnalyticsStats(
        await fetchJson<unknown>(`/api/analytics/stats?days=${days}${chatbotIdParam}`),
      );
    },
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<Metrics>({
    queryKey: ["/api/analytics/metrics", selectedChatbot, days],
    queryFn: async () => {
      return asMetrics(
        await fetchJson<unknown>(`/api/analytics/metrics?days=${days}${chatbotIdParam}`),
      );
    },
  });

  const { data: dailyStats, isLoading: dailyLoading } = useQuery<DailyStats[]>({
    queryKey: ["/api/analytics/daily", selectedChatbot, days],
    queryFn: async () => {
      return asArray<DailyStats>(
        await fetchJson<unknown>(`/api/analytics/daily?days=${days}${chatbotIdParam}`),
      );
    },
  });

  const { data: conversations, isLoading: conversationsLoading } = useQuery<ConversationWithMessages[]>({
    queryKey: ["/api/analytics/conversations", selectedChatbot],
    queryFn: async () => {
      return asArray<ConversationWithMessages>(
        await fetchJson<unknown>(`/api/analytics/conversations?limit=10${chatbotIdParam}`),
      );
    },
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await apiRequest("GET", "/api/export");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chatbot-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: "Exportación completada", description: "Tus datos han sido descargados." });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo exportar los datos.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = statsLoading || dailyLoading || conversationsLoading || metricsLoading;
  const safeChatbots = asArray<Chatbot>(chatbots);
  const safeDailyStats = asArray<DailyStats>(dailyStats);
  const safeConversations = asArray<ConversationWithMessages>(conversations);

  const formatResponseTime = (ms: number | null) => {
    if (ms === null) return "—";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const statCards = [
    {
      title: "Conversaciones",
      value: stats?.totalConversations?.toString() || "0",
      change: `+${stats?.conversationsToday || 0} hoy`,
      changeType: (stats?.conversationsToday || 0) > 0 ? "positive" as const : "neutral" as const,
      icon: MessageSquare,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Mensajes",
      value: stats?.totalMessages?.toString() || "0",
      change: `+${stats?.messagesToday || 0} hoy`,
      changeType: (stats?.messagesToday || 0) > 0 ? "positive" as const : "neutral" as const,
      icon: Users,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Tiempo de Respuesta",
      value: formatResponseTime(metrics?.averageResponseTimeMs || null),
      change: "Promedio",
      changeType: "neutral" as const,
      icon: Clock,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Satisfacción",
      value: metrics?.averageRating ? `${metrics.averageRating.toFixed(1)}/5` : "—",
      change: metrics?.averageRating ? "Calificación promedio" : "Sin datos",
      changeType: "neutral" as const,
      icon: Star,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
  ];

  const pieData = [
    { name: "Usuario", value: stats?.userMessages || 0 },
    { name: "Bot", value: stats?.assistantMessages || 0 },
  ];

  const chartData = safeDailyStats.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
  }));

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Estadísticas</h1>
          <p className="text-muted-foreground">
            Rastrea el rendimiento y uso de tus chatbots
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button 
            variant="outline" 
            onClick={handleExport} 
            disabled={isExporting}
            data-testid="button-export"
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exportando..." : "Exportar Datos"}
          </Button>
          {chatbotsLoading ? (
            <Skeleton className="h-10 w-48" />
          ) : (
            <Select value={selectedChatbot} onValueChange={setSelectedChatbot}>
              <SelectTrigger className="w-48" data-testid="select-chatbot">
                <SelectValue placeholder="Todos los chatbots" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Chatbots</SelectItem>
                {safeChatbots.map((chatbot) => (
                  <SelectItem key={chatbot.id} value={chatbot.id.toString()}>
                    {chatbot.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36" data-testid="select-time-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Últimas 24 horas</SelectItem>
              <SelectItem value="7d">Últimos 7 días</SelectItem>
              <SelectItem value="30d">Últimos 30 días</SelectItem>
              <SelectItem value="90d">Últimos 90 días</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p
                    className={`text-xs ${
                      stat.changeType === "positive"
                        ? "text-green-500"
                        : "text-muted-foreground"
                    }`}
                  >
                    {stat.change}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Conversaciones en el Tiempo</CardTitle>
            <CardDescription>Número de conversaciones iniciadas cada día</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : chartData.length > 0 && chartData.some(d => d.conversations > 0) ? (
              <ResponsiveContainer width="100%" height={256}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="conversations" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Conversaciones" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
                <div className="text-center">
                  <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Sin datos disponibles aún
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Inicia conversaciones para ver las estadísticas
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución de Mensajes</CardTitle>
            <CardDescription>Proporción de mensajes de usuario vs bot</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (stats?.totalMessages || 0) > 0 ? (
              <ResponsiveContainer width="100%" height={256}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
                <div className="text-center">
                  <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Sin mensajes aún
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Los datos del chat aparecerán aquí
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversaciones Recientes</CardTitle>
          <CardDescription>Últimas interacciones con tus chatbots (haz clic para ver detalles)</CardDescription>
        </CardHeader>
        <CardContent>
          {conversationsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (safeConversations.length || 0) > 0 ? (
            <div className="space-y-4">
              {safeConversations.map((conv) => (
                <div 
                  key={conv.conversation.id} 
                  className="rounded-lg border p-4 cursor-pointer hover-elevate"
                  onClick={() => setSelectedConversation(conv)}
                  data-testid={`conversation-${conv.conversation.id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{conv.chatbotName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conv.conversation.createdAt), { 
                          addSuffix: true, 
                          locale: es 
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {conv.messages.length} mensajes en esta conversación
                  </div>
                  {getLastAssistantMessage(conv.messages)?.knowledgeStrategy && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">
                        {getKnowledgeStrategyLabel(getLastAssistantMessage(conv.messages)?.knowledgeStrategy)}
                      </Badge>
                      {typeof getLastAssistantMessage(conv.messages)?.knowledgeChunks === "number" && (
                        <span>{getLastAssistantMessage(conv.messages)?.knowledgeChunks} fragmento(s)</span>
                      )}
                      {(getLastAssistantMessage(conv.messages)?.knowledgeSources?.length || 0) > 0 && (
                        <span>{getLastAssistantMessage(conv.messages)?.knowledgeSources?.length} fuente(s)</span>
                      )}
                    </div>
                  )}
                  {conv.messages.length > 0 && (
                    <div className="mt-2 text-sm truncate">
                      <span className="text-muted-foreground">Último mensaje: </span>
                      {conv.messages[conv.messages.length - 1]?.content.substring(0, 100)}
                      {(conv.messages[conv.messages.length - 1]?.content.length || 0) > 100 && "..."}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
              <div className="text-center">
                <Users className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Sin conversaciones aún
                </p>
                <p className="text-xs text-muted-foreground">
                  Inserta tu chatbot en un sitio web para comenzar a recopilar datos
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedConversation} onOpenChange={() => setSelectedConversation(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Conversación con {selectedConversation?.chatbotName}</DialogTitle>
            <DialogDescription>
              {selectedConversation && formatDistanceToNow(new Date(selectedConversation.conversation.createdAt), { 
                addSuffix: true, 
                locale: es 
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 p-4">
            {selectedConversation?.messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}
                >
                  <ChatMessageContent
                    content={msg.content}
                    role={msg.role === "user" ? "user" : "assistant"}
                  />
                  {msg.role === 'assistant' && (msg.knowledgeStrategy || (msg.knowledgeSources?.length || 0) > 0) && (
                    <div className="mt-3 rounded-md border border-border/60 bg-background/60 p-2 text-xs text-muted-foreground">
                      <div className="flex flex-wrap items-center gap-2">
                        {getKnowledgeStrategyLabel(msg.knowledgeStrategy) && (
                          <Badge variant="secondary" className="text-[10px]">
                            {getKnowledgeStrategyLabel(msg.knowledgeStrategy)}
                          </Badge>
                        )}
                        {typeof msg.knowledgeChunks === "number" && (
                          <span>{msg.knowledgeChunks} fragmento(s)</span>
                        )}
                      </div>
                      {(msg.knowledgeSources?.length || 0) > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="font-medium text-foreground/80">Fuentes recuperadas</p>
                          <ul className="space-y-1">
                            {msg.knowledgeSources!.slice(0, 3).map((source) => (
                              <li key={source} className="truncate" title={source}>
                                {source}
                              </li>
                            ))}
                          </ul>
                          {msg.knowledgeSources!.length > 3 && (
                            <p>+{msg.knowledgeSources!.length - 3} fuente(s) mas</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <div className={`text-xs mt-1 ${msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    {msg.role === 'assistant' && msg.responseTimeMs && (
                      <span className="ml-2">({formatResponseTime(msg.responseTimeMs)})</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
