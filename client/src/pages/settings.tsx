import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/components/theme-provider";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Chatbot } from "@shared/schema";
import { Moon, Sun, Monitor, Save, Key, Bell, Shield, Globe, Timer, FileClock, Database, Play, RefreshCw } from "lucide-react";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [selectedChatbot, setSelectedChatbot] = useState("");
  const [securityForm, setSecurityForm] = useState({
    allowedDomains: "",
    widgetRateLimitPerMinute: 20,
    widgetMaxMessageLength: 1200,
    widgetRequirePrivacyNotice: true,
    widgetPrivacyNotice: "Este asistente brinda orientación informativa. No compartas datos sensibles o de emergencia por este chat.",
    dataRetentionDays: 180,
  });

  const [mysqlForm, setMysqlForm] = useState({ enabled: false, host: "192.168.8.39", port: 3306, database: "", user: "", password: "", intervalMinutes: 15 });
  const [mysqlStatus, setMysqlStatus] = useState<string | null>(null);
  const { data: chatbots, isLoading: isLoadingChatbots } = useQuery<Chatbot[]>({
    queryKey: ["/api/chatbots"],
  });

  const selectedBot = chatbots?.find((chatbot) => chatbot.id.toString() === selectedChatbot);

  const { data: mysqlConfig } = useQuery<{ enabled: boolean; host: string; port: number; database: string; user: string; passwordConfigured: boolean; intervalMinutes: number; lastSyncedAt: string | null }>({
    queryKey: ["/api/chatbots", selectedChatbot, "mysql-sync"],
    queryFn: async () => { const response = await fetch(`/api/chatbots/${selectedChatbot}/mysql-sync`, { credentials: "include" }); if (!response.ok) throw new Error("No se pudo cargar MySQL."); return response.json(); },
    enabled: Boolean(selectedChatbot),
  });
  useEffect(() => {
    if (!selectedChatbot && chatbots?.[0]) {
      setSelectedChatbot(chatbots[0].id.toString());
    }
  }, [chatbots, selectedChatbot]);

  useEffect(() => {
    if (!selectedBot) return;
    setSecurityForm({
      allowedDomains: selectedBot.allowedDomains || "",
      widgetRateLimitPerMinute: selectedBot.widgetRateLimitPerMinute || 20,
      widgetMaxMessageLength: selectedBot.widgetMaxMessageLength || 1200,
      widgetRequirePrivacyNotice: selectedBot.widgetRequirePrivacyNotice ?? true,
      widgetPrivacyNotice: selectedBot.widgetPrivacyNotice || "Este asistente brinda orientación informativa. No compartas datos sensibles o de emergencia por este chat.",
      dataRetentionDays: selectedBot.dataRetentionDays || 180,
    });
  }, [selectedBot]);

  useEffect(() => {
    if (!mysqlConfig) return;
    setMysqlForm((current) => ({ ...current, enabled: mysqlConfig.enabled, host: mysqlConfig.host, port: mysqlConfig.port, database: mysqlConfig.database, user: mysqlConfig.user, password: "", intervalMinutes: mysqlConfig.intervalMinutes }));
  }, [mysqlConfig]);

  const saveMysqlMutation = useMutation({
    mutationFn: async () => (await apiRequest("PUT", `/api/chatbots/${selectedChatbot}/mysql-sync`, mysqlForm)).json(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/chatbots", selectedChatbot, "mysql-sync"] }); setMysqlForm((current) => ({ ...current, password: "" })); setMysqlStatus("Configuración guardada. La contraseña permanece oculta."); },
    onError: (error: Error) => setMysqlStatus(error.message),
  });
  const testMysqlMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/chatbots/${selectedChatbot}/mysql-sync/test`)).json() as Promise<{ procedures: number }>,
    onSuccess: (result) => setMysqlStatus(`Conexión correcta. Se encontraron ${result.procedures} registros.`),
    onError: (error: Error) => setMysqlStatus(error.message),
  });
  const runMysqlMutation = useMutation({
    mutationFn: async (dryRun: boolean) => (await apiRequest("POST", `/api/chatbots/${selectedChatbot}/mysql-sync/run`, { dryRun })).json() as Promise<{ sourceRows: number; created: number; updated: number; skipped: number; dryRun: boolean }>,
    onSuccess: (result) => { queryClient.invalidateQueries({ queryKey: ["/api/chatbots", selectedChatbot, "mysql-sync"] }); setMysqlStatus(`${result.dryRun ? "Prueba" : "Sincronización"}: ${result.sourceRows} origen, ${result.created} nuevos, ${result.updated} actualizados, ${result.skipped} sin cambios.`); },
    onError: (error: Error) => setMysqlStatus(error.message),
  });
  const saveSecurityMutation = useMutation({
    mutationFn: async () => {
      if (!selectedChatbot) throw new Error("Selecciona un chatbot.");
      const response = await apiRequest("PATCH", `/api/chatbots/${selectedChatbot}`, securityForm);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots"] });
      toast({
        title: "Seguridad actualizada",
        description: "La configuración productiva del widget fue guardada.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "No se pudo guardar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold">Configuración</h1>
        <p className="text-muted-foreground">
          Administra tu cuenta y preferencias de la plataforma
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Seguridad Productiva del Widget
            </CardTitle>
            <CardDescription>
              Controles visibles y aplicados para publicar el asistente en sitios externos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-[280px_1fr]">
              <div className="space-y-2">
                <Label>Chatbot</Label>
                <Select value={selectedChatbot} onValueChange={setSelectedChatbot} disabled={isLoadingChatbots}>
                  <SelectTrigger data-testid="select-security-chatbot">
                    <SelectValue placeholder="Selecciona un chatbot" />
                  </SelectTrigger>
                  <SelectContent>
                    {chatbots?.map((chatbot) => (
                      <SelectItem key={chatbot.id} value={chatbot.id.toString()}>
                        {chatbot.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    Mensajes por minuto
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={securityForm.widgetRateLimitPerMinute}
                    onChange={(event) => setSecurityForm((current) => ({ ...current, widgetRateLimitPerMinute: Number(event.target.value) }))}
                    data-testid="input-widget-rate-limit"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Longitud máxima</Label>
                  <Input
                    type="number"
                    min={200}
                    max={5000}
                    value={securityForm.widgetMaxMessageLength}
                    onChange={(event) => setSecurityForm((current) => ({ ...current, widgetMaxMessageLength: Number(event.target.value) }))}
                    data-testid="input-widget-max-message"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileClock className="h-4 w-4" />
                    Retención de datos
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={3650}
                    value={securityForm.dataRetentionDays}
                    onChange={(event) => setSecurityForm((current) => ({ ...current, dataRetentionDays: Number(event.target.value) }))}
                    data-testid="input-retention-days"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Dominios permitidos
                </Label>
                <Textarea
                  value={securityForm.allowedDomains}
                  onChange={(event) => setSecurityForm((current) => ({ ...current, allowedDomains: event.target.value }))}
                  placeholder={"difzapopan.gob.mx\nwww.difzapopan.gob.mx"}
                  className="min-h-28"
                  data-testid="textarea-allowed-domains"
                />
                <p className="text-xs text-muted-foreground">
                  Un origen por línea o separado por coma. Usa https://www.difzapopan.gob.mx y https://difzapopan.gob.mx. En producción, vacío bloquea el acceso CORS externo.
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>Aviso de privacidad en widget</Label>
                    <p className="text-sm text-muted-foreground">
                      Muestra un aviso compacto al final del chat embebido.
                    </p>
                  </div>
                  <Switch
                    checked={securityForm.widgetRequirePrivacyNotice}
                    onCheckedChange={(checked) => setSecurityForm((current) => ({ ...current, widgetRequirePrivacyNotice: checked }))}
                    data-testid="switch-widget-privacy"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Texto del aviso</Label>
                  <Textarea
                    value={securityForm.widgetPrivacyNotice}
                    onChange={(event) => setSecurityForm((current) => ({ ...current, widgetPrivacyNotice: event.target.value }))}
                    className="min-h-24"
                    data-testid="textarea-widget-privacy-notice"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => saveSecurityMutation.mutate()}
                disabled={!selectedChatbot || saveSecurityMutation.isPending}
                data-testid="button-save-production-security"
              >
                <Save className="mr-2 h-4 w-4" />
                {saveSecurityMutation.isPending ? "Guardando..." : "Guardar seguridad"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />Sincronización MySQL de Trámites y Servicios</CardTitle>
            <CardDescription>Actualiza el RAG desde la aplicación fuente. La contraseña se cifra en el servidor y no vuelve a mostrarse.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2"><Label>Host</Label><Input value={mysqlForm.host} onChange={(event) => setMysqlForm((current) => ({ ...current, host: event.target.value }))} data-testid="input-mysql-host" /></div>
              <div className="space-y-2"><Label>Puerto</Label><Input type="number" value={mysqlForm.port} onChange={(event) => setMysqlForm((current) => ({ ...current, port: Number(event.target.value) }))} data-testid="input-mysql-port" /></div>
              <div className="space-y-2"><Label>Base de datos</Label><Input value={mysqlForm.database} onChange={(event) => setMysqlForm((current) => ({ ...current, database: event.target.value }))} placeholder="sql_programas_se" data-testid="input-mysql-database" /></div>
              <div className="space-y-2"><Label>Usuario de solo lectura</Label><Input value={mysqlForm.user} onChange={(event) => setMysqlForm((current) => ({ ...current, user: event.target.value }))} data-testid="input-mysql-user" /></div>
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_220px]">
              <div className="space-y-2"><Label>Contraseña</Label><Input type="password" value={mysqlForm.password} onChange={(event) => setMysqlForm((current) => ({ ...current, password: event.target.value }))} placeholder={mysqlConfig?.passwordConfigured ? "Configurada. Escribe otra sólo para reemplazarla." : "Contraseña de MySQL"} data-testid="input-mysql-password" /></div>
              <div className="space-y-2"><Label>Intervalo programado</Label><Input type="number" min={5} max={1440} value={mysqlForm.intervalMinutes} onChange={(event) => setMysqlForm((current) => ({ ...current, intervalMinutes: Number(event.target.value) }))} data-testid="input-mysql-interval" /></div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
              <div className="flex items-center gap-3"><Switch checked={mysqlForm.enabled} onCheckedChange={(enabled) => setMysqlForm((current) => ({ ...current, enabled }))} data-testid="switch-mysql-sync" /><div><Label>Habilitar sincronización</Label><p className="text-sm text-muted-foreground">Sólo integra registros vigentes de 2026.</p></div></div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => saveMysqlMutation.mutate()} disabled={!selectedChatbot || saveMysqlMutation.isPending} data-testid="button-save-mysql-sync"><Save className="mr-2 h-4 w-4" />Guardar</Button>
                <Button variant="outline" onClick={() => testMysqlMutation.mutate()} disabled={!mysqlConfig?.passwordConfigured || testMysqlMutation.isPending} data-testid="button-test-mysql-sync"><RefreshCw className="mr-2 h-4 w-4" />Probar conexión</Button>
                <Button variant="outline" onClick={() => runMysqlMutation.mutate(true)} disabled={!mysqlConfig?.passwordConfigured || runMysqlMutation.isPending} data-testid="button-dry-run-mysql-sync">Prueba</Button>
                <Button onClick={() => runMysqlMutation.mutate(false)} disabled={!mysqlConfig?.passwordConfigured || runMysqlMutation.isPending} data-testid="button-run-mysql-sync"><Play className="mr-2 h-4 w-4" />Sincronizar ahora</Button>
              </div>
            </div>
            {mysqlStatus && <p className="text-sm text-muted-foreground" data-testid="text-mysql-sync-status">{mysqlStatus}</p>}
            {mysqlConfig?.lastSyncedAt && <p className="text-xs text-muted-foreground">Última sincronización: {new Date(mysqlConfig.lastSyncedAt).toLocaleString("es-MX")}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              Apariencia
            </CardTitle>
            <CardDescription>
              Personaliza cómo se ve la plataforma para ti
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Tema</Label>
              <div className="flex gap-2">
                {[
                  { value: "light", label: "Claro", icon: Sun },
                  { value: "dark", label: "Oscuro", icon: Moon },
                  { value: "system", label: "Sistema", icon: Monitor },
                ].map((t) => (
                  <Button
                    key={t.value}
                    variant={theme === t.value ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setTheme(t.value as typeof theme)}
                    data-testid={`button-theme-${t.value}`}
                  >
                    <t.icon className="mr-2 h-4 w-4" />
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaciones
            </CardTitle>
            <CardDescription>
              Configura cómo recibes las notificaciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                id: "email-notifications",
                label: "Notificaciones por Email",
                description: "Recibe actualizaciones por correo electrónico",
              },
              {
                id: "browser-notifications",
                label: "Notificaciones del Navegador",
                description: "Recibe notificaciones en tu navegador",
              },
              {
                id: "weekly-digest",
                label: "Resumen Semanal",
                description: "Recibe un resumen cada semana",
              },
            ].map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor={item.id}>{item.label}</Label>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <Switch id={item.id} data-testid={`switch-${item.id}`} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Claves API
            </CardTitle>
            <CardDescription>
              Administra las integraciones de API externas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openai-key">Clave API de OpenAI (Opcional)</Label>
              <div className="flex gap-2">
                <Input
                  id="openai-key"
                  type="password"
                  placeholder="sk-..."
                  className="flex-1"
                  data-testid="input-openai-key"
                />
                <Button variant="outline" data-testid="button-save-openai-key">
                  <Save className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Por defecto, usamos las integraciones de IA de Replit. Agrega tu propia clave para más control.
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="anthropic-key">Clave API de Anthropic (Opcional)</Label>
              <div className="flex gap-2">
                <Input
                  id="anthropic-key"
                  type="password"
                  placeholder="sk-ant-..."
                  className="flex-1"
                  data-testid="input-anthropic-key"
                />
                <Button variant="outline" data-testid="button-save-anthropic-key">
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Seguridad
            </CardTitle>
            <CardDescription>
              Administra la configuración de seguridad de tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Autenticación de Dos Factores</Label>
                <p className="text-sm text-muted-foreground">
                  Agrega una capa extra de seguridad
                </p>
              </div>
              <Button variant="outline" data-testid="button-enable-2fa">Activar</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Sesiones Activas</Label>
                <p className="text-sm text-muted-foreground">
                  Administra los dispositivos conectados a tu cuenta
                </p>
              </div>
              <Button variant="outline" data-testid="button-view-sessions">Ver</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-destructive">Eliminar Cuenta</Label>
                <p className="text-sm text-muted-foreground">
                  Elimina permanentemente tu cuenta y datos
                </p>
              </div>
              <Button variant="destructive" data-testid="button-delete-account">Eliminar</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
