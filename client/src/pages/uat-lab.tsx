import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileJson, FileSpreadsheet, Lightbulb, Loader2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface UatAnalysisResult {
  files: {
    conversationExport: {
      originalName: string;
      size: number;
      storedPath: string;
    };
    uatWorkbook: {
      originalName: string;
      size: number;
      storedPath: string | null;
    } | null;
  };
  analysis: {
    exportedAt: string | null;
    chatbotNames: string[];
    knowledgeBaseItems: number;
    conversations: number;
    messages: number;
    roles: Record<string, number>;
    dateRange: [string | null, string | null];
    assistantStrategies: Record<string, number>;
    issueFlags: Record<string, number>;
    topSources: Array<{ source: string; count: number }>;
    examples: Array<{
      conversationId?: number;
      createdAt?: string;
      user: string;
      assistant: string;
      flags: string[];
      strategy: string | null;
      chunks: number | null;
      sources: string[];
    }>;
    recommendations: string[];
  };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin dato";
  return new Date(value).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function labelForFlag(flag: string) {
  const labels: Record<string, string> = {
    sin_dato_o_no_encontrado: "Sin dato / no encontrado",
    terminos_internos: "Términos internos",
    posible_invencion_pasos: "Posible invención de pasos",
    formato_inconsistente: "Formato inconsistente",
    respuesta_larga: "Respuesta larga",
    rag_sin_fragmentos: "RAG sin fragmentos",
  };

  return labels[flag] || flag.replace(/_/g, " ");
}

export default function UatLab() {
  const { toast } = useToast();
  const [conversationExport, setConversationExport] = useState<File | null>(null);
  const [uatWorkbook, setUatWorkbook] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UatAnalysisResult | null>(null);

  const issueEntries = useMemo(() => {
    return Object.entries(result?.analysis.issueFlags || {}).sort((a, b) => b[1] - a[1]);
  }, [result]);

  const strategyEntries = useMemo(() => {
    return Object.entries(result?.analysis.assistantStrategies || {}).sort((a, b) => b[1] - a[1]);
  }, [result]);

  const handleAnalyze = async () => {
    if (!conversationExport) {
      toast({
        title: "Falta el JSON",
        description: "Sube el archivo exportado con conversaciones para iniciar el análisis.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("conversationExport", conversationExport);
    if (uatWorkbook) {
      formData.append("uatWorkbook", uatWorkbook);
    }

    setIsUploading(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/uat/analyze", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "No se pudo analizar el paquete UAT.");
      }

      setResult((await response.json()) as UatAnalysisResult);
      toast({
        title: "Análisis listo",
        description: "Se procesó el paquete UAT y se guardó la evidencia subida.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo analizar el paquete UAT.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Laboratorio UAT</h1>
        <p className="max-w-3xl text-muted-foreground">
          Carga conversaciones reales y la bitácora de hallazgos para convertir pruebas ciudadanas en mejoras accionables para SofIA.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Paquete de análisis</CardTitle>
          <CardDescription>El JSON es obligatorio; el Excel UAT queda asociado como evidencia del ciclo de pruebas.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <div className="space-y-2">
            <Label htmlFor="conversation-export" className="flex items-center gap-2">
              <FileJson className="h-4 w-4" />
              Conversaciones JSON
            </Label>
            <Input
              id="conversation-export"
              type="file"
              accept=".json,application/json"
              onChange={(event) => setConversationExport(event.target.files?.[0] || null)}
            />
            {conversationExport && (
              <p className="text-xs text-muted-foreground">{conversationExport.name} · {formatBytes(conversationExport.size)}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="uat-workbook" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Bitácora UAT Excel
            </Label>
            <Input
              id="uat-workbook"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(event) => setUatWorkbook(event.target.files?.[0] || null)}
            />
            {uatWorkbook && (
              <p className="text-xs text-muted-foreground">{uatWorkbook.name} · {formatBytes(uatWorkbook.size)}</p>
            )}
          </div>

          <Button onClick={handleAnalyze} disabled={isUploading} className="min-w-40">
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Analizar
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Conversaciones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{result.analysis.conversations}</div>
                <p className="text-xs text-muted-foreground">{result.analysis.messages} mensajes</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Base de conocimiento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{result.analysis.knowledgeBaseItems}</div>
                <p className="text-xs text-muted-foreground">registros en el export</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Periodo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">{formatDate(result.analysis.dateRange[0])}</div>
                <p className="text-xs text-muted-foreground">a {formatDate(result.analysis.dateRange[1])}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Alertas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{issueEntries.reduce((sum, [, count]) => sum + count, 0)}</div>
                <p className="text-xs text-muted-foreground">{issueEntries.length} tipo(s) detectado(s)</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Hallazgos automáticos</CardTitle>
                <CardDescription>Señales para revisar contra la bitácora humana.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {issueEntries.length > 0 ? (
                  issueEntries.map(([flag, count]) => (
                    <div key={flag} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium">{labelForFlag(flag)}</span>
                      </div>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    No se detectaron alertas en el barrido automático.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recuperación y fuentes</CardTitle>
                <CardDescription>Estrategias usadas por respuestas de SofIA y fuentes más consultadas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {strategyEntries.map(([strategy, count]) => (
                    <Badge key={strategy} variant="outline">{strategy}: {count}</Badge>
                  ))}
                </div>
                <Separator />
                <div className="space-y-2">
                  {result.analysis.topSources.slice(0, 6).map((source) => (
                    <div key={source.source} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate" title={source.source}>{source.source}</span>
                      <Badge variant="secondary">{source.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recomendaciones</CardTitle>
              <CardDescription>Próximas mejoras sugeridas a partir del paquete cargado.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {result.analysis.recommendations.map((recommendation) => (
                <div key={recommendation} className="flex gap-3 rounded-md border p-3">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm">{recommendation}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ejemplos para revisión</CardTitle>
              <CardDescription>Conversaciones candidatas para cruzar con observaciones del Excel UAT.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[520px] pr-4">
                <div className="space-y-4">
                  {result.analysis.examples.map((example, index) => (
                    <div key={`${example.conversationId}-${index}`} className="rounded-md border p-4">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">Conversación {example.conversationId || "sin ID"}</Badge>
                        {example.flags.map((flag) => (
                          <Badge key={flag} variant="secondary">{labelForFlag(flag)}</Badge>
                        ))}
                        {example.strategy && <Badge>{example.strategy}</Badge>}
                        {typeof example.chunks === "number" && <Badge variant="outline">{example.chunks} fragmento(s)</Badge>}
                      </div>
                      <div className="grid gap-3 lg:grid-cols-2">
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Usuario</p>
                          <p className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">{example.user || "Sin mensaje previo"}</p>
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">SofIA</p>
                          <p className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">{example.assistant}</p>
                        </div>
                      </div>
                      {example.sources.length > 0 && (
                        <p className="mt-3 truncate text-xs text-muted-foreground" title={example.sources.join(", ")}>
                          Fuentes: {example.sources.join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
