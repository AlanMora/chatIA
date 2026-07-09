import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Code2, Copy, Check, Monitor, Tablet, Smartphone, Globe, Blocks, Tag, LayoutTemplate } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ChatWidget } from "@/components/chat-widget";
import type { Chatbot } from "@shared/schema";
import { useSearch } from "wouter";

const WIDGET_EMBED_VERSION = "20260706-avatar-font";

export default function EmbedPage() {
  const { toast } = useToast();
  const searchParams = useSearch();
  const urlParams = new URLSearchParams(searchParams);
  const preselectedChatbot = urlParams.get("chatbot");
  
  const [selectedChatbot, setSelectedChatbot] = useState<string>(preselectedChatbot || "");
  const [copied, setCopied] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [embedTemplate, setEmbedTemplate] = useState<"html" | "wordpress" | "elementor" | "gtm">("html");
  const [embedOptions, setEmbedOptions] = useState({
    autoOpen: false,
    openDelay: 3000,
    hideMobile: false,
  });

  const { data: chatbots, isLoading } = useQuery<Chatbot[]>({
    queryKey: ["/api/chatbots"],
  });

  const selectedBot = chatbots?.find((c) => c.id.toString() === selectedChatbot);

  const scriptAttributes = selectedChatbot
    ? [
        `src="${window.location.origin}/widget.js?v=${WIDGET_EMBED_VERSION}"`,
        `data-chatbot-id="${selectedChatbot}"`,
        embedOptions.autoOpen ? `data-auto-open="true"` : null,
        embedOptions.autoOpen ? `data-open-delay="${embedOptions.openDelay}"` : null,
        embedOptions.hideMobile ? `data-hide-mobile="true"` : null,
      ].filter(Boolean).join(" ")
    : "";

  const baseScript = selectedChatbot ? `<script ${scriptAttributes}></script>` : "";

  const embedCode = selectedChatbot
    ? {
        html: `${baseScript}`,
        wordpress: `<!-- WordPress: pega este bloque en Apariencia > Editor de archivos del tema antes de </body>, o en un plugin de headers/footers -->\n${baseScript}`,
        elementor: `<!-- Elementor: agrega un widget HTML en la página o plantilla global y pega este código -->\n${baseScript}`,
        gtm: `<!-- Google Tag Manager: crea una etiqueta Custom HTML y dispara en All Pages -->\n${baseScript}`,
      }[embedTemplate]
    : "";

  const templateMeta = {
    html: {
      title: "Página Web / HTML",
      description: "Para sitios propios, Laravel, React, HTML estático o plantillas normales.",
      icon: Globe,
    },
    wordpress: {
      title: "WordPress",
      description: "Para plugins de headers/footers, tema hijo o bloque HTML global.",
      icon: Blocks,
    },
    elementor: {
      title: "Elementor",
      description: "Para pegarlo en un widget HTML dentro de una página o plantilla.",
      icon: LayoutTemplate,
    },
    gtm: {
      title: "Google Tag Manager",
      description: "Para publicarlo como etiqueta Custom HTML en todas las páginas.",
      icon: Tag,
    },
  };

  const handleCopy = async () => {
    if (!embedCode) return;
    await navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast({
      title: "¡Copiado!",
      description: "Código de inserción copiado al portapapeles.",
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
          <h1 className="text-3xl font-semibold">Código de Inserción</h1>
          <p className="text-muted-foreground">
            Obtén el código para agregar tu chatbot a cualquier sitio web
          </p>
        </div>
        {isLoading ? (
          <Skeleton className="h-10 w-48" />
        ) : (
          <Select value={selectedChatbot} onValueChange={setSelectedChatbot}>
            <SelectTrigger className="w-56" data-testid="select-chatbot">
              <SelectValue placeholder="Selecciona un chatbot" />
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
            <h3 className="mt-6 text-xl font-semibold">Selecciona un Chatbot</h3>
            <p className="mt-2 text-center text-muted-foreground max-w-sm">
              Elige un chatbot del menú desplegable para obtener su código de inserción.
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
                  Plantillas de Inserción
                </CardTitle>
                <CardDescription>
                  Elige la plataforma y copia el bloque listo para publicar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(templateMeta).map(([key, item]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setEmbedTemplate(key as typeof embedTemplate)}
                      className={`rounded-lg border p-3 text-left transition-colors hover:border-primary ${embedTemplate === key ? "border-primary bg-primary/5" : ""}`}
                      data-testid={`button-template-${key}`}
                    >
                      <div className="flex items-center gap-2 font-medium">
                        <item.icon className="h-4 w-4" />
                        {item.title}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                    </button>
                  ))}
                </div>

                <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label>Autoabrir</Label>
                      <p className="text-xs text-muted-foreground">Abre el chat después de cargar.</p>
                    </div>
                    <Switch
                      checked={embedOptions.autoOpen}
                      onCheckedChange={(checked) => setEmbedOptions((current) => ({ ...current, autoOpen: checked }))}
                      data-testid="switch-auto-open"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Demora (ms)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={500}
                      value={embedOptions.openDelay}
                      disabled={!embedOptions.autoOpen}
                      onChange={(event) => setEmbedOptions((current) => ({ ...current, openDelay: Number(event.target.value) }))}
                      data-testid="input-open-delay"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label>Ocultar en móvil</Label>
                      <p className="text-xs text-muted-foreground">No carga el widget en pantallas pequeñas.</p>
                    </div>
                    <Switch
                      checked={embedOptions.hideMobile}
                      onCheckedChange={(checked) => setEmbedOptions((current) => ({ ...current, hideMobile: checked }))}
                      data-testid="switch-hide-mobile"
                    />
                  </div>
                </div>

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
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Guía de Integración</CardTitle>
                <CardDescription>
                  Sigue estos pasos para agregar el chatbot a tu sitio web
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      step: 1,
                      title: "Copia el código",
                      description: "Haz clic en el botón copiar de arriba para copiar el script.",
                    },
                    {
                      step: 2,
                      title: "Abre el HTML de tu sitio",
                      description: "Encuentra el archivo HTML o plantilla donde quieres agregar el chatbot.",
                    },
                    {
                      step: 3,
                      title: "Pega antes de </body>",
                      description: "Agrega el script justo antes de la etiqueta de cierre body.",
                    },
                    {
                      step: 4,
                      title: "Guarda y publica",
                      description: "Guarda los cambios y publica tu sitio web.",
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
                <CardTitle>Detalles del Widget</CardTitle>
                <CardDescription>
                  Configuración de {selectedBot?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Estado</span>
                    <Badge variant={selectedBot?.isActive ? "default" : "secondary"}>
                      {selectedBot?.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Modelo de IA</span>
                    <span className="text-sm font-medium">{selectedBot?.aiModel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Posición</span>
                    <span className="text-sm font-medium capitalize">
                      {selectedBot?.position?.replace("-", " ")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Color Principal</span>
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
                  <CardTitle>Vista Previa en Vivo</CardTitle>
                  <CardDescription>Mira cómo se ve tu widget</CardDescription>
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
