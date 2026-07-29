import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useInterviewChat } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Send, RefreshCw, BrainCircuit, User } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function MockInterview() {
  const { toast } = useToast();
  const [started, setStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [role, setRole] = useState("");
  const [interviewType, setInterviewType] = useState("technical");
  const [techStack, setTechStack] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatMutation = useInterviewChat();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startInterview = () => {
    if (!role.trim()) {
      toast({ title: "Role required", description: "Enter a target role to begin.", variant: "destructive" });
      return;
    }
    setStarted(true);
    setIsComplete(false);
    const initMessages: Message[] = [];
    sendMessage(initMessages, "Hello! I'm ready to begin my interview.");
  };

  const sendMessage = (currentMessages: Message[], userText: string) => {
    const newMessages: Message[] = [...currentMessages, { role: "user", content: userText }];
    setMessages(newMessages);
    setInput("");
    chatMutation.mutate(
      {
        data: {
          messages: newMessages,
          role,
          interviewType: interviewType as never,
          techStack: techStack || null,
        },
      },
      {
        onSuccess: (data) => {
          setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
          if (data.isComplete) setIsComplete(true);
        },
        onError: () => toast({ title: "Error", description: "Failed to get response. Try again.", variant: "destructive" }),
      }
    );
  };

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;
    sendMessage(messages, input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setStarted(false);
    setIsComplete(false);
    setMessages([]);
    setInput("");
  };

  if (!started) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          <Card className="border-border/60 shadow-md">
            <CardContent className="pt-8 pb-8 space-y-5">
              <div className="text-center mb-2">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                  <BrainCircuit className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-bold">Mock Interview</h1>
                <p className="text-muted-foreground mt-1 text-sm">Configure your AI interview session and practice in real-time.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Target Role *</Label>
                <Input
                  placeholder="e.g. Software Engineer, Product Manager"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  data-testid="input-mock-role"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Interview Type</Label>
                <Select value={interviewType} onValueChange={setInterviewType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="hr">HR / Culture Fit</SelectItem>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                    <SelectItem value="system-design">System Design</SelectItem>
                    <SelectItem value="ml-ai">ML / AI</SelectItem>
                    <SelectItem value="dsa">DSA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tech Stack (optional)</Label>
                <Input
                  placeholder="e.g. React, Python, AWS"
                  value={techStack}
                  onChange={(e) => setTechStack(e.target.value)}
                />
              </div>
              <Button className="w-full gap-2" onClick={startInterview} data-testid="button-start-interview">
                Start Interview <Send className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="border-b border-border/60 px-4 py-3 flex items-center justify-between bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <BrainCircuit className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-semibold text-sm">AI Interviewer</div>
            <div className="text-xs text-muted-foreground capitalize">{role} — {interviewType.replace("-", " ")}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isComplete && <Badge variant="secondary" className="text-green-600 bg-green-100 dark:bg-green-900/30">Complete</Badge>}
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> New Interview
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && chatMutation.isPending && (
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <BrainCircuit className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 max-w-md">
              <div className="flex gap-1 items-center h-5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.3s]" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.15s]" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" />
              </div>
            </div>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              data-testid={`message-${i}`}
            >
              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === "assistant" ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"
              }`}>
                {msg.role === "assistant" ? <BrainCircuit className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>
              <div
                className={`max-w-[75%] sm:max-w-[65%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "assistant"
                    ? "bg-muted text-foreground rounded-tl-sm"
                    : "bg-primary text-primary-foreground rounded-tr-sm"
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {chatMutation.isPending && messages.length > 0 && (
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <BrainCircuit className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.3s]" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.15s]" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border/60 px-4 py-4 bg-background">
        {isComplete ? (
          <div className="text-center text-sm text-muted-foreground py-2">
            Interview complete. <button onClick={handleReset} className="text-primary hover:underline font-medium">Start a new one</button>
          </div>
        ) : (
          <div className="flex gap-3 items-end max-w-4xl mx-auto">
            <Textarea
              placeholder="Type your answer and press Enter..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className="resize-none flex-1"
              disabled={chatMutation.isPending}
              data-testid="input-chat-message"
            />
            <Button
              onClick={handleSend}
              disabled={chatMutation.isPending || !input.trim()}
              className="h-10 w-10 p-0 shrink-0"
              data-testid="button-send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
