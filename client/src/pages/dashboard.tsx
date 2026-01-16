import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Bot, MessageSquare, Users, TrendingUp, Plus, ArrowRight } from "lucide-react";
import type { Chatbot } from "@shared/schema";

export default function Dashboard() {
  const { data: chatbots, isLoading } = useQuery<Chatbot[]>({
    queryKey: ["/api/chatbots"],
  });

  const activeChatbots = chatbots?.filter(c => c.isActive) || [];
  const totalConversations = 0;
  const totalMessages = 0;

  const stats = [
    {
      title: "Chatbots Activos",
      value: activeChatbots.length,
      icon: Bot,
      description: "Desplegados actualmente",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Conversaciones",
      value: totalConversations,
      icon: MessageSquare,
      description: "Total histórico",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Mensajes",
      value: totalMessages,
      icon: Users,
      description: "Intercambiados",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Tiempo de Respuesta",
      value: "1.2s",
      icon: TrendingUp,
      description: "Últimas 24 horas",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Inicio</h1>
        <p className="text-muted-foreground">
          ¡Bienvenido! Aquí tienes un resumen de tu plataforma de chatbots.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
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
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Tus Chatbots</CardTitle>
              <CardDescription>Administra tus chatbots de IA</CardDescription>
            </div>
            <Button asChild data-testid="button-create-chatbot">
              <Link href="/chatbots/new">
                <Plus className="mr-2 h-4 w-4" />
                Crear Nuevo
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : chatbots && chatbots.length > 0 ? (
              <div className="space-y-3">
                {chatbots.slice(0, 5).map((chatbot) => (
                  <Link
                    key={chatbot.id}
                    href={`/chatbots/${chatbot.id}`}
                    className="flex items-center gap-4 rounded-lg p-3 hover-elevate active-elevate-2 border border-transparent hover:border-border"
                    data-testid={`card-chatbot-${chatbot.id}`}
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: chatbot.primaryColor || "#3B82F6" }}
                    >
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{chatbot.name}</span>
                        <Badge variant={chatbot.isActive ? "default" : "secondary"} className="text-xs">
                          {chatbot.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {chatbot.description || "Sin descripción"}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Bot className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 font-medium">No hay chatbots aún</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Crea tu primer chatbot de IA para comenzar
                </p>
                <Button asChild className="mt-4" data-testid="button-create-first-chatbot">
                  <Link href="/chatbots/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Chatbot
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Guía de Inicio Rápido</CardTitle>
            <CardDescription>Pon tu chatbot en funcionamiento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  step: 1,
                  title: "Crea un Chatbot",
                  description: "Configura tu asistente de IA con un nombre, personalidad y apariencia.",
                },
                {
                  step: 2,
                  title: "Agrega Base de Conocimiento",
                  description: "Sube documentos o agrega contenido para entrenar tu chatbot.",
                },
                {
                  step: 3,
                  title: "Obtén el Código",
                  description: "Copia el script y pégalo en tu sitio web.",
                },
                {
                  step: 4,
                  title: "¡Listo!",
                  description: "Tu chatbot está listo para asistir a tus visitantes.",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-4" data-testid={`step-${item.step}`}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="font-medium">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
