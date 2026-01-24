import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import type { Chatbot } from "@shared/schema";

export default function ChatbotTest() {
  const [, params] = useRoute("/chatbots/:id/test");
  const chatbotId = parseInt(params?.id || "0");

  const { data: chatbot, isLoading } = useQuery<Chatbot>({
    queryKey: ["/api/chatbots", chatbotId],
    enabled: !!chatbotId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800">
        <Skeleton className="w-96 h-[600px] rounded-xl" />
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-lg text-muted-foreground">Chatbot no encontrado</p>
        <Link href="/chatbots">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
      </div>
    );
  }

  const widgetScript = `
    (function() {
      var baseUrl = window.location.origin;
      var chatbotId = ${chatbotId};
      
      // Inject widget script
      var script = document.createElement('script');
      script.src = baseUrl + '/widget.js';
      script.setAttribute('data-chatbot-id', chatbotId);
      document.body.appendChild(script);
    })();
  `;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="fixed top-4 left-4 z-50 flex items-center gap-2">
        <Link href={`/chatbots/${chatbotId}`}>
          <Button variant="outline" size="sm" className="bg-background/80 backdrop-blur" data-testid="button-back-to-editor">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Editor
          </Button>
        </Link>
      </div>

      <div className="fixed top-4 right-4 z-50">
        <div className="flex items-center gap-2 px-4 py-2 bg-background/80 backdrop-blur rounded-lg border">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium">Modo de Prueba en Vivo</span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Probando: {chatbot.name}</h1>
          <p className="text-muted-foreground">
            El widget aparecerá en la esquina como lo vería un visitante real de tu sitio web
          </p>
        </div>

        <div className="w-full max-w-4xl bg-background rounded-2xl shadow-2xl border overflow-hidden">
          <div className="h-8 bg-muted flex items-center gap-2 px-4 border-b">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="bg-background px-4 py-1 rounded-md text-xs text-muted-foreground flex items-center gap-2">
                <ExternalLink className="h-3 w-3" />
                www.tusitio.com
              </div>
            </div>
          </div>

          <div className="h-[500px] bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 p-8">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="h-8 bg-muted/50 rounded w-3/4" />
              <div className="h-4 bg-muted/30 rounded w-full" />
              <div className="h-4 bg-muted/30 rounded w-5/6" />
              <div className="h-4 bg-muted/30 rounded w-4/6" />
              <div className="h-32 bg-muted/20 rounded-lg" />
              <div className="h-4 bg-muted/30 rounded w-full" />
              <div className="h-4 bg-muted/30 rounded w-3/4" />
            </div>
          </div>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Haz clic en el botón del widget para iniciar una conversación de prueba
        </p>
      </div>

      <script dangerouslySetInnerHTML={{ __html: widgetScript }} />
    </div>
  );
}
