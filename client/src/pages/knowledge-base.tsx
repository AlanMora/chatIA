import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BookOpen, Plus, FileText, Link as LinkIcon, Trash2, Upload, Globe, File } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Chatbot, KnowledgeBaseItem } from "@shared/schema";

export default function KnowledgeBase() {
  const { toast } = useToast();
  const [selectedChatbot, setSelectedChatbot] = useState<string>("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<KnowledgeBaseItem | null>(null);
  const [activeTab, setActiveTab] = useState("text");
  const [newItem, setNewItem] = useState({
    title: "",
    content: "",
    sourceType: "text",
    sourceUrl: "",
  });
  const [urlInput, setUrlInput] = useState("");
  const [urlTitle, setUrlTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileTitle, setFileTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: chatbots, isLoading: isLoadingChatbots } = useQuery<Chatbot[]>({
    queryKey: ["/api/chatbots"],
  });

  const { data: knowledgeItems, isLoading: isLoadingItems } = useQuery<KnowledgeBaseItem[]>({
    queryKey: ["/api/knowledge-base", selectedChatbot],
    enabled: !!selectedChatbot,
  });

  const addMutation = useMutation({
    mutationFn: async (data: typeof newItem & { chatbotId: number }) => {
      const response = await apiRequest("POST", "/api/knowledge-base", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base", selectedChatbot] });
      toast({
        title: "Contenido agregado",
        description: "El contenido ha sido agregado a la base de conocimiento.",
      });
      resetDialog();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo agregar el contenido. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/knowledge-base/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al subir");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base", selectedChatbot] });
      toast({
        title: "Archivo subido",
        description: "El contenido del archivo ha sido extraído y agregado a la base de conocimiento.",
      });
      resetDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al subir",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const extractUrlMutation = useMutation({
    mutationFn: async (data: { chatbotId: number; url: string; title?: string }) => {
      const response = await apiRequest("POST", "/api/knowledge-base/url", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base", selectedChatbot] });
      toast({
        title: "Contenido extraído",
        description: "El contenido de la página web ha sido agregado a la base de conocimiento.",
      });
      resetDialog();
    },
    onError: () => {
      toast({
        title: "Error de extracción",
        description: "No se pudo extraer el contenido de la URL. Verifica la URL e inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  const resetDialog = () => {
    setAddDialogOpen(false);
    setNewItem({ title: "", content: "", sourceType: "text", sourceUrl: "" });
    setUrlInput("");
    setUrlTitle("");
    setSelectedFile(null);
    setFileTitle("");
    setActiveTab("text");
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/knowledge-base/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base", selectedChatbot] });
      toast({
        title: "Contenido eliminado",
        description: "El contenido ha sido eliminado de la base de conocimiento.",
      });
      setDeleteDialogOpen(false);
      setSelectedItem(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el contenido. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  const handleAdd = () => {
    if (!selectedChatbot || !newItem.title || !newItem.content) return;
    addMutation.mutate({
      ...newItem,
      chatbotId: parseInt(selectedChatbot),
    });
  };

  const handleDelete = (item: KnowledgeBaseItem) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "url":
        return <LinkIcon className="h-4 w-4" />;
      case "file":
        return <Upload className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getSourceLabel = (type: string) => {
    switch (type) {
      case "url":
        return "URL";
      case "file":
        return "Archivo";
      default:
        return "Texto";
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Base de Conocimiento</h1>
          <p className="text-muted-foreground">
            Agrega contenido para entrenar tus chatbots
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {isLoadingChatbots ? (
            <Skeleton className="h-10 w-48" />
          ) : (
            <Select value={selectedChatbot} onValueChange={setSelectedChatbot}>
              <SelectTrigger className="w-48" data-testid="select-chatbot">
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
          )}
          <Button
            onClick={() => setAddDialogOpen(true)}
            disabled={!selectedChatbot}
            data-testid="button-add-item"
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar Contenido
          </Button>
        </div>
      </div>

      {!selectedChatbot ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-6 text-xl font-semibold">Selecciona un Chatbot</h3>
            <p className="mt-2 text-center text-muted-foreground max-w-sm">
              Elige un chatbot del menú desplegable para administrar su base de conocimiento.
            </p>
          </CardContent>
        </Card>
      ) : isLoadingItems ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : knowledgeItems && knowledgeItems.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {knowledgeItems.map((item) => (
            <Card key={item.id} className="group" data-testid={`card-knowledge-${item.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    {getSourceIcon(item.sourceType || "text")}
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{item.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {getSourceLabel(item.sourceType || "text")}
                      </Badge>
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(item)}
                  data-testid={`button-delete-${item.id}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {item.content}
                </p>
                {item.sourceUrl && (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <LinkIcon className="h-3 w-3" />
                    {item.sourceUrl}
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-6 text-xl font-semibold">Sin contenido aún</h3>
            <p className="mt-2 text-center text-muted-foreground max-w-sm">
              Agrega contenido para ayudar a tu chatbot a responder preguntas con más precisión.
            </p>
            <Button className="mt-6" onClick={() => setAddDialogOpen(true)} data-testid="button-add-first">
              <Plus className="mr-2 h-4 w-4" />
              Agregar Tu Primer Contenido
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={addDialogOpen} onOpenChange={(open) => !open && resetDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Agregar Contenido</DialogTitle>
            <DialogDescription>
              Agrega contenido que tu chatbot pueda usar para responder preguntas.
            </DialogDescription>
          </DialogHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="text" data-testid="tab-text">
                <FileText className="h-4 w-4 mr-2" />
                Texto
              </TabsTrigger>
              <TabsTrigger value="file" data-testid="tab-file">
                <File className="h-4 w-4 mr-2" />
                Archivo
              </TabsTrigger>
              <TabsTrigger value="url" data-testid="tab-url">
                <Globe className="h-4 w-4 mr-2" />
                URL
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Título</label>
                <Input
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  placeholder="ej. Preguntas Frecuentes"
                  data-testid="input-kb-title"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Contenido</label>
                <Textarea
                  value={newItem.content}
                  onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
                  placeholder="Escribe el contenido que tu chatbot debe conocer..."
                  className="min-h-32 resize-none"
                  data-testid="input-kb-content"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetDialog}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={!newItem.title || !newItem.content || addMutation.isPending}
                  data-testid="button-confirm-add"
                >
                  {addMutation.isPending ? "Agregando..." : "Agregar Contenido"}
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="file" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Título (opcional)</label>
                <Input
                  value={fileTitle}
                  onChange={(e) => setFileTitle(e.target.value)}
                  placeholder="Dejar vacío para usar el nombre del archivo"
                  data-testid="input-file-title"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Subir Archivo</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                  data-testid="input-file"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <File className="h-8 w-8 text-primary" />
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="font-medium">Haz clic para subir</p>
                      <p className="text-sm text-muted-foreground">
                        PDF, DOC, DOCX o TXT (máx 10MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetDialog}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (!selectedFile || !selectedChatbot) return;
                    const formData = new FormData();
                    formData.append("file", selectedFile);
                    formData.append("chatbotId", selectedChatbot);
                    if (fileTitle) formData.append("title", fileTitle);
                    uploadFileMutation.mutate(formData);
                  }}
                  disabled={!selectedFile || uploadFileMutation.isPending}
                  data-testid="button-upload-file"
                >
                  {uploadFileMutation.isPending ? "Subiendo..." : "Subir Archivo"}
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="url" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Título (opcional)</label>
                <Input
                  value={urlTitle}
                  onChange={(e) => setUrlTitle(e.target.value)}
                  placeholder="Dejar vacío para usar el título de la página"
                  data-testid="input-url-title"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">URL de la Página Web</label>
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://ejemplo.com/pagina"
                  data-testid="input-url"
                />
                <p className="text-xs text-muted-foreground">
                  Ingresa una URL para extraer su contenido para la base de conocimiento de tu chatbot.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetDialog}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (!urlInput || !selectedChatbot) return;
                    extractUrlMutation.mutate({
                      chatbotId: parseInt(selectedChatbot),
                      url: urlInput,
                      title: urlTitle || undefined,
                    });
                  }}
                  disabled={!urlInput || extractUrlMutation.isPending}
                  data-testid="button-extract-url"
                >
                  {extractUrlMutation.isPending ? "Extrayendo..." : "Extraer Contenido"}
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Contenido</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar "{selectedItem?.title}"? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedItem && deleteMutation.mutate(selectedItem.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
