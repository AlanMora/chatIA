import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";

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
      const res = await fetch(`/api/analytics/stats?days=${days}${chatbotIdParam}`);
      return res.json();
    },
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<Metrics>({
    queryKey: ["/api/analytics/metrics", selectedChatbot, days],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/metrics?days=${days}${chatbotIdParam}`);
      return res.json();
    },
  });

  const { data: dailyStats, isLoading: dailyLoading } = useQuery<DailyStats[]>({
    queryKey: ["/api/analytics/daily", selectedChatbot, days],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/daily?days=${days}${chatbotIdParam}`);
      return res.json();
    },
  });

  const { data: conversations, isLoading: conversationsLoading } = useQuery<ConversationWithMessages[]>({
    queryKey: ["/api/analytics/conversations", selectedChatbot],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/conversations?limit=10${chatbotIdParam}`);
      return res.json();
    },
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/export');
      if (!res.ok) throw new Error('Export failed');
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

  const chartData = dailyStats?.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
  })) || [];

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
                {chatbots?.map((chatbot) => (
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
          ) : (conversations?.length || 0) > 0 ? (
            <div className="space-y-4">
              {conversations?.map((conv) => (
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
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
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
