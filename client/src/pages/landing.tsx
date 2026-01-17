import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, MessageSquare, Mic, Globe, Zap, Shield } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">ChatBot AI</span>
          </div>
          <Button asChild data-testid="button-login">
            <a href="/api/login">Iniciar Sesión</a>
          </Button>
        </div>
      </header>

      <main>
        <section className="container px-4 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Crea chatbots con IA para tu sitio web
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Plataforma completa para crear, entrenar y desplegar chatbots inteligentes con voz. 
              Sin código, sin complicaciones.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild data-testid="button-get-started">
                <a href="/api/login">Comenzar Gratis</a>
              </Button>
            </div>
          </div>
        </section>

        <section className="container px-4 py-16">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="hover-elevate">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Chat Inteligente</h3>
                <p className="text-sm text-muted-foreground">
                  Respuestas precisas basadas en tu base de conocimiento personalizada.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Mic className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Voz Integrada</h3>
                <p className="text-sm text-muted-foreground">
                  Conversaciones por voz con tecnología ElevenLabs para una experiencia natural.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Fácil Integración</h3>
                <p className="text-sm text-muted-foreground">
                  Una línea de código para agregar el chatbot a cualquier sitio web.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Múltiples Modelos IA</h3>
                <p className="text-sm text-muted-foreground">
                  Elige entre GPT-4, Gemini o conecta tu propio servidor de IA.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Seguro y Privado</h3>
                <p className="text-sm text-muted-foreground">
                  Tus datos y conversaciones están protegidos con encriptación.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Personalizable</h3>
                <p className="text-sm text-muted-foreground">
                  Adapta colores, mensajes y comportamiento a tu marca.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container px-4 text-center text-sm text-muted-foreground">
          <p>ChatBot AI Platform</p>
        </div>
      </footer>
    </div>
  );
}
