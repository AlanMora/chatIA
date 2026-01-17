import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">ChatBot AI</CardTitle>
          <CardDescription>
            Inicia sesión para acceder a tu plataforma de chatbots
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button size="lg" className="w-full" asChild data-testid="button-login">
            <a href="/api/login">Iniciar Sesión</a>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Accede con Google, GitHub, Apple o email
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
