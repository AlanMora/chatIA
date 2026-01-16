import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { BookOpen, Plus, FileText, Link as LinkIcon, Trash2, Upload } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Chatbot, KnowledgeBaseItem } from "@shared/schema";

export default function KnowledgeBase() {
  const { toast } = useToast();
  const [selectedChatbot, setSelectedChatbot] = useState<string>("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<KnowledgeBaseItem | null>(null);
  const [newItem, setNewItem] = useState({
    title: "",
    content: "",
    sourceType: "text",
    sourceUrl: "",
  });

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
        title: "Item added",
        description: "Knowledge base item has been added successfully.",
      });
      setAddDialogOpen(false);
      setNewItem({ title: "", content: "", sourceType: "text", sourceUrl: "" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/knowledge-base/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base", selectedChatbot] });
      toast({
        title: "Item deleted",
        description: "Knowledge base item has been deleted.",
      });
      setDeleteDialogOpen(false);
      setSelectedItem(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete item. Please try again.",
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

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Knowledge Base</h1>
          <p className="text-muted-foreground">
            Add content to train your chatbots
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {isLoadingChatbots ? (
            <Skeleton className="h-10 w-48" />
          ) : (
            <Select value={selectedChatbot} onValueChange={setSelectedChatbot}>
              <SelectTrigger className="w-48" data-testid="select-chatbot">
                <SelectValue placeholder="Select a chatbot" />
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
            Add Content
          </Button>
        </div>
      </div>

      {!selectedChatbot ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-6 text-xl font-semibold">Select a Chatbot</h3>
            <p className="mt-2 text-center text-muted-foreground max-w-sm">
              Choose a chatbot from the dropdown above to manage its knowledge base.
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
                      <Badge variant="secondary" className="text-xs capitalize">
                        {item.sourceType || "text"}
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
            <h3 className="mt-6 text-xl font-semibold">No knowledge base items</h3>
            <p className="mt-2 text-center text-muted-foreground max-w-sm">
              Add content to help your chatbot answer questions more accurately.
            </p>
            <Button className="mt-6" onClick={() => setAddDialogOpen(true)} data-testid="button-add-first">
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Content
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Knowledge Base Content</DialogTitle>
            <DialogDescription>
              Add content that your chatbot can reference when answering questions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                placeholder="e.g., Product FAQ"
                data-testid="input-kb-title"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Source Type</label>
              <Select
                value={newItem.sourceType}
                onValueChange={(value) => setNewItem({ ...newItem, sourceType: value })}
              >
                <SelectTrigger data-testid="select-source-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text Content</SelectItem>
                  <SelectItem value="url">URL Source</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newItem.sourceType === "url" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Source URL</label>
                <Input
                  value={newItem.sourceUrl}
                  onChange={(e) => setNewItem({ ...newItem, sourceUrl: e.target.value })}
                  placeholder="https://example.com/page"
                  data-testid="input-kb-url"
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Content</label>
              <Textarea
                value={newItem.content}
                onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
                placeholder="Enter the content your chatbot should know..."
                className="min-h-32 resize-none"
                data-testid="input-kb-content"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!newItem.title || !newItem.content || addMutation.isPending}
              data-testid="button-confirm-add"
            >
              {addMutation.isPending ? "Adding..." : "Add Content"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedItem?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedItem && deleteMutation.mutate(selectedItem.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
