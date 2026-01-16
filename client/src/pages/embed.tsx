import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Code2, Copy, Check, Monitor, Tablet, Smartphone, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ChatWidget } from "@/components/chat-widget";
import type { Chatbot } from "@shared/schema";
import { useSearch } from "wouter";

export default function EmbedPage() {
  const { toast } = useToast();
  const searchParams = useSearch();
  const urlParams = new URLSearchParams(searchParams);
  const preselectedChatbot = urlParams.get("chatbot");
  
  const [selectedChatbot, setSelectedChatbot] = useState<string>(preselectedChatbot || "");
  const [copied, setCopied] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const { data: chatbots, isLoading } = useQuery<Chatbot[]>({
    queryKey: ["/api/chatbots"],
  });

  const selectedBot = chatbots?.find((c) => c.id.toString() === selectedChatbot);

  const embedCode = selectedChatbot
    ? `<script src="${window.location.origin}/widget.js" data-chatbot-id="${selectedChatbot}"></script>`
    : "";

  const handleCopy = async () => {
    if (!embedCode) return;
    await navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Embed code copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const deviceWidths = {
    desktop: "w-full",
    tablet: "w-[768px] mx-auto",
    mobile: "w-[375px] mx-auto",
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Embed Code</h1>
          <p className="text-muted-foreground">
            Get the code to add your chatbot to any website
          </p>
        </div>
        {isLoading ? (
          <Skeleton className="h-10 w-48" />
        ) : (
          <Select value={selectedChatbot} onValueChange={setSelectedChatbot}>
            <SelectTrigger className="w-56" data-testid="select-chatbot">
              <SelectValue placeholder="Select a chatbot" />
            </SelectTrigger>
            <SelectContent>
              {chatbots?.map((chatbot) => (
                <SelectItem key={chatbot.id} value={chatbot.id.toString()}>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: chatbot.primaryColor || "#3B82F6" }}
                    />
                    {chatbot.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!selectedChatbot ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Code2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-6 text-xl font-semibold">Select a Chatbot</h3>
            <p className="mt-2 text-center text-muted-foreground max-w-sm">
              Choose a chatbot from the dropdown above to get its embed code.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  Embed Script
                </CardTitle>
                <CardDescription>
                  Copy this code and paste it before the closing &lt;/body&gt; tag of your website
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm font-mono">
                    <code>{embedCode}</code>
                  </pre>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute right-2 top-2"
                    onClick={handleCopy}
                    data-testid="button-copy-code"
                  >
                    {copied ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Integration Guide</CardTitle>
                <CardDescription>
                  Follow these steps to add the chatbot to your website
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      step: 1,
                      title: "Copy the embed code",
                      description: "Click the copy button above to copy the script tag.",
                    },
                    {
                      step: 2,
                      title: "Open your website's HTML",
                      description: "Find the HTML file or template where you want to add the chatbot.",
                    },
                    {
                      step: 3,
                      title: "Paste before </body>",
                      description: "Add the script just before the closing body tag.",
                    },
                    {
                      step: 4,
                      title: "Save and publish",
                      description: "Save your changes and publish your website.",
                    },
                  ].map((item) => (
                    <div key={item.step} className="flex gap-4" data-testid={`guide-step-${item.step}`}>
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

            <Card>
              <CardHeader>
                <CardTitle>Widget Details</CardTitle>
                <CardDescription>
                  Configuration for {selectedBot?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={selectedBot?.isActive ? "default" : "secondary"}>
                      {selectedBot?.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">AI Model</span>
                    <span className="text-sm font-medium">{selectedBot?.aiModel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Position</span>
                    <span className="text-sm font-medium capitalize">
                      {selectedBot?.position?.replace("-", " ")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Primary Color</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-4 w-4 rounded-full border"
                        style={{ backgroundColor: selectedBot?.primaryColor || "#3B82F6" }}
                      />
                      <span className="text-sm font-medium">{selectedBot?.primaryColor}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle>Live Preview</CardTitle>
                  <CardDescription>See how your widget looks</CardDescription>
                </div>
                <Tabs value={previewDevice} onValueChange={(v) => setPreviewDevice(v as typeof previewDevice)}>
                  <TabsList>
                    <TabsTrigger value="desktop" data-testid="button-preview-desktop">
                      <Monitor className="h-4 w-4" />
                    </TabsTrigger>
                    <TabsTrigger value="tablet" data-testid="button-preview-tablet">
                      <Tablet className="h-4 w-4" />
                    </TabsTrigger>
                    <TabsTrigger value="mobile" data-testid="button-preview-mobile">
                      <Smartphone className="h-4 w-4" />
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent>
                <div className={`${deviceWidths[previewDevice]} transition-all duration-300`}>
                  <div className="relative h-[500px] rounded-lg border bg-muted/30 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/10" />
                    <div className="absolute top-4 left-4 right-4 space-y-2">
                      <div className="h-3 w-1/4 rounded bg-muted" />
                      <div className="h-2 w-2/3 rounded bg-muted" />
                      <div className="h-2 w-1/2 rounded bg-muted" />
                    </div>
                    {selectedBot && (
                      <ChatWidget chatbot={selectedBot} isPreview />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
