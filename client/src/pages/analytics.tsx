import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, MessageSquare, Users, Clock, TrendingUp } from "lucide-react";
import { useState } from "react";
import type { Chatbot } from "@shared/schema";

export default function Analytics() {
  const [selectedChatbot, setSelectedChatbot] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("7d");

  const { data: chatbots, isLoading } = useQuery<Chatbot[]>({
    queryKey: ["/api/chatbots"],
  });

  const stats = [
    {
      title: "Total Conversations",
      value: "0",
      change: "+0%",
      changeType: "neutral" as const,
      icon: MessageSquare,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Messages Exchanged",
      value: "0",
      change: "+0%",
      changeType: "neutral" as const,
      icon: Users,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Avg Response Time",
      value: "1.2s",
      change: "-0.3s",
      changeType: "positive" as const,
      icon: Clock,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "User Satisfaction",
      value: "N/A",
      change: "No data",
      changeType: "neutral" as const,
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Analytics</h1>
          <p className="text-muted-foreground">
            Track your chatbot performance and usage
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {isLoading ? (
            <Skeleton className="h-10 w-48" />
          ) : (
            <Select value={selectedChatbot} onValueChange={setSelectedChatbot}>
              <SelectTrigger className="w-48" data-testid="select-chatbot">
                <SelectValue placeholder="All chatbots" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chatbots</SelectItem>
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
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
              <p
                className={`text-xs ${
                  stat.changeType === "positive"
                    ? "text-green-500"
                    : stat.changeType === "negative"
                    ? "text-red-500"
                    : "text-muted-foreground"
                }`}
              >
                {stat.change} from last period
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Conversations Over Time</CardTitle>
            <CardDescription>Number of conversations started each day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
              <div className="text-center">
                <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No data available yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Start conversations to see analytics
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Message Distribution</CardTitle>
            <CardDescription>User vs. bot messages ratio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
              <div className="text-center">
                <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No messages yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Chat data will appear here
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
          <CardDescription>Latest interactions with your chatbots</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
            <div className="text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No conversations yet
              </p>
              <p className="text-xs text-muted-foreground">
                Embed your chatbot on a website to start collecting data
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
