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
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and platform preferences
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize how the platform looks for you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Theme</Label>
              <div className="flex gap-2">
                {[
                  { value: "light", label: "Light", icon: Sun },
                  { value: "dark", label: "Dark", icon: Moon },
                  { value: "system", label: "System", icon: Monitor },
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
              Notifications
            </CardTitle>
            <CardDescription>
              Configure how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                id: "email-notifications",
                label: "Email Notifications",
                description: "Receive updates via email",
              },
              {
                id: "browser-notifications",
                label: "Browser Notifications",
                description: "Get notified in your browser",
              },
              {
                id: "weekly-digest",
                label: "Weekly Digest",
                description: "Get a summary every week",
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
              API Keys
            </CardTitle>
            <CardDescription>
              Manage external API integrations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openai-key">OpenAI API Key (Optional)</Label>
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
                By default, we use Replit AI Integrations. Add your own key for more control.
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="anthropic-key">Anthropic API Key (Optional)</Label>
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
              Security
            </CardTitle>
            <CardDescription>
              Manage your account security settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security
                </p>
              </div>
              <Button variant="outline" data-testid="button-enable-2fa">Enable</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Active Sessions</Label>
                <p className="text-sm text-muted-foreground">
                  Manage devices logged into your account
                </p>
              </div>
              <Button variant="outline" data-testid="button-view-sessions">View</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-destructive">Delete Account</Label>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and data
                </p>
              </div>
              <Button variant="destructive" data-testid="button-delete-account">Delete</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
