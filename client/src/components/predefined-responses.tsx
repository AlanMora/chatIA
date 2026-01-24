import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Edit2, Save, X, MessageSquare } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PredefinedResponse } from "@shared/schema";

interface PredefinedResponsesProps {
  chatbotId: number;
}

export function PredefinedResponses({ chatbotId }: PredefinedResponsesProps) {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newResponse, setNewResponse] = useState({ title: "", content: "", category: "" });
  const [editResponse, setEditResponse] = useState({ title: "", content: "", category: "" });

  const { data: responses, isLoading } = useQuery<PredefinedResponse[]>({
    queryKey: ["/api/predefined-responses", chatbotId],
    enabled: !!chatbotId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { chatbotId: number; title: string; content: string; category: string }) => {
      const response = await apiRequest("POST", "/api/predefined-responses", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/predefined-responses", chatbotId] });
      setIsAdding(false);
      setNewResponse({ title: "", content: "", category: "" });
      toast({ title: "Respuesta creada", description: "La respuesta predefinida se ha creado correctamente." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo crear la respuesta.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; title?: string; content?: string; category?: string; isActive?: boolean }) => {
      const response = await apiRequest("PATCH", `/api/predefined-responses/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/predefined-responses", chatbotId] });
      setEditingId(null);
      toast({ title: "Respuesta actualizada", description: "La respuesta se ha actualizado correctamente." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo actualizar la respuesta.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/predefined-responses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/predefined-responses", chatbotId] });
      toast({ title: "Respuesta eliminada", description: "La respuesta se ha eliminado correctamente." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar la respuesta.", variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!newResponse.title.trim() || !newResponse.content.trim()) return;
    createMutation.mutate({
      chatbotId,
      title: newResponse.title,
      content: newResponse.content,
      category: newResponse.category,
    });
  };

  const handleEdit = (response: PredefinedResponse) => {
    setEditingId(response.id);
    setEditResponse({
      title: response.title,
      content: response.content,
      category: response.category || "",
    });
  };

  const handleSaveEdit = () => {
    if (!editingId || !editResponse.title.trim() || !editResponse.content.trim()) return;
    updateMutation.mutate({
      id: editingId,
      title: editResponse.title,
      content: editResponse.content,
      category: editResponse.category,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Respuestas Predefinidas
          </CardTitle>
          <CardDescription>
            Configura respuestas rápidas que el chatbot puede usar
          </CardDescription>
        </div>
        {!isAdding && (
          <Button size="sm" onClick={() => setIsAdding(true)} data-testid="button-add-response">
            <Plus className="h-4 w-4 mr-1" />
            Agregar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {isAdding && (
          <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
            <Input
              placeholder="Título (ej: Horarios de atención)"
              value={newResponse.title}
              onChange={(e) => setNewResponse({ ...newResponse, title: e.target.value })}
              data-testid="input-new-response-title"
            />
            <Textarea
              placeholder="Contenido de la respuesta..."
              value={newResponse.content}
              onChange={(e) => setNewResponse({ ...newResponse, content: e.target.value })}
              rows={3}
              data-testid="input-new-response-content"
            />
            <Input
              placeholder="Categoría (opcional)"
              value={newResponse.category}
              onChange={(e) => setNewResponse({ ...newResponse, category: e.target.value })}
              data-testid="input-new-response-category"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-save-new-response">
                <Save className="h-4 w-4 mr-1" />
                Guardar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsAdding(false)} data-testid="button-cancel-new-response">
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {responses && responses.length > 0 ? (
          responses.map((response) => (
            <div key={response.id} className="p-4 border rounded-lg space-y-2">
              {editingId === response.id ? (
                <div className="space-y-3">
                  <Input
                    value={editResponse.title}
                    onChange={(e) => setEditResponse({ ...editResponse, title: e.target.value })}
                    data-testid={`input-edit-response-title-${response.id}`}
                  />
                  <Textarea
                    value={editResponse.content}
                    onChange={(e) => setEditResponse({ ...editResponse, content: e.target.value })}
                    rows={3}
                    data-testid={`input-edit-response-content-${response.id}`}
                  />
                  <Input
                    placeholder="Categoría (opcional)"
                    value={editResponse.category}
                    onChange={(e) => setEditResponse({ ...editResponse, category: e.target.value })}
                    data-testid={`input-edit-response-category-${response.id}`}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                      <Save className="h-4 w-4 mr-1" />
                      Guardar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{response.title}</span>
                        {response.category && (
                          <Badge variant="secondary" className="text-xs">{response.category}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{response.content}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={response.isActive ?? true}
                        onCheckedChange={(checked) => updateMutation.mutate({ id: response.id, isActive: checked })}
                        data-testid={`switch-response-active-${response.id}`}
                      />
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(response)} data-testid={`button-edit-response-${response.id}`}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => deleteMutation.mutate(response.id)}
                        className="text-destructive"
                        data-testid={`button-delete-response-${response.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        ) : (
          !isAdding && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No hay respuestas predefinidas</p>
              <p className="text-sm">Agrega respuestas rápidas para tu chatbot</p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
