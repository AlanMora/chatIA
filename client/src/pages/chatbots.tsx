import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Bot, Plus, MoreVertical, Pencil, Trash2, Code2, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Chatbot } from "@shared/schema";

export default function Chatbots() {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedChatbot, setSelectedChatbot] = useState<Chatbot | null>(null);

  const { data: chatbots, isLoading } = useQuery<Chatbot[]>({
    queryKey: ["/api/chatbots"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/chatbots/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots"] });
      toast({
        title: "Chatbot deleted",
        description: "The chatbot has been successfully deleted.",
      });
      setDeleteDialogOpen(false);
      setSelectedChatbot(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the chatbot. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (chatbot: Chatbot) => {
    setSelectedChatbot(chatbot);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Chatbots</h1>
          <p className="text-muted-foreground">
            Create and manage your AI chatbots
          </p>
        </div>
        <Button asChild data-testid="button-new-chatbot">
          <Link href="/chatbots/new">
            <Plus className="mr-2 h-4 w-4" />
            New Chatbot
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : chatbots && chatbots.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chatbots.map((chatbot) => (
            <Card 
              key={chatbot.id} 
              className="group hover-elevate"
              data-testid={`card-chatbot-${chatbot.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: chatbot.primaryColor || "#3B82F6" }}
                    >
                      <Bot className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{chatbot.name}</h3>
                        <Badge variant={chatbot.isActive ? "default" : "secondary"} className="text-xs shrink-0">
                          {chatbot.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {chatbot.description || "No description provided"}
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{chatbot.aiProvider}</span>
                        <span>•</span>
                        <span>{chatbot.aiModel}</span>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0" data-testid={`button-menu-${chatbot.id}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/chatbots/${chatbot.id}`} className="flex items-center">
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/chatbots/${chatbot.id}/preview`} className="flex items-center">
                          <Eye className="mr-2 h-4 w-4" />
                          Preview
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/embed?chatbot=${chatbot.id}`} className="flex items-center">
                          <Code2 className="mr-2 h-4 w-4" />
                          Get Embed Code
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(chatbot)}
                        data-testid={`button-delete-${chatbot.id}`}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Bot className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-6 text-xl font-semibold">No chatbots yet</h3>
            <p className="mt-2 text-center text-muted-foreground max-w-sm">
              Create your first AI chatbot to start engaging with your website visitors.
            </p>
            <Button asChild className="mt-6" data-testid="button-create-first">
              <Link href="/chatbots/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Chatbot
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chatbot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedChatbot?.name}"? This action cannot be undone and will remove all associated conversations and knowledge base items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedChatbot && deleteMutation.mutate(selectedChatbot.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
