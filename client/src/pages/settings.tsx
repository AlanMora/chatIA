import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/components/theme-provider";
import { Moon, Sun, Monitor, Save, Key, Bell, Shield } from "lucide-react";

export default function Settings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold">Configuración</h1>
        <p className="text-muted-foreground">
          Administra tu cuenta y preferencias de la plataforma
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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
