import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

interface ChatMessageContentProps {
  content: string;
  role: "user" | "assistant";
  className?: string;
}

export function ChatMessageContent({
  content,
  role,
  className,
}: ChatMessageContentProps) {
  if (role === "user") {
    return (
      <p className={cn("text-sm whitespace-pre-wrap break-words", className)}>
        {content}
      </p>
    );
  }

  return (
    <div className={cn("chat-markdown text-sm", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          a: ({ node: _node, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noreferrer noopener"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
