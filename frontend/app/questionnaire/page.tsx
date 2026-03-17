"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Scale, 
    Send, 
    Gavel, 
    User, 
    Bot, 
    ArrowLeft,
    Loader2,
    Sparkles,
    ShieldCheck
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { api, API_BASE_URL } from "@/lib/api";
import { juraiStorage, Session } from "@/lib/storage";
import { NavBar } from "@/components/NavBar";

interface Message {
    role: "user" | "assistant";
    content: string;
    timestamp: string;
}

const INTAKE_SYSTEM_PROMPT = `You are JurAI's intake agent. Your job is to learn about a software product feature so a compliance analysis can be performed.

You ask ONE short question at a time. Never ask multiple questions in a single message.
Each question must build naturally on the previous answer.

INFORMATION TO COLLECT (adapt order to the conversation):
feature_name, feature_description, jurisdictions, data_collected, data_storage,
user_consent, uses_ai, ai_impact, law0_policies, legal_concerns

RULES:
- Keep questions short (1-2 sentences max).
- Ask one focused follow-up if an answer is vague, then move on.
- Once all 10 topics are covered, output ONLY this JSON and nothing else:
  {"done": true, "summary": "<2-3 sentence plain English summary>", "collected": {<field_key: answer pairs>}}
- Never ask more than 12 questions total. Wrap up by question 12 regardless.
- Never repeat a question already answered.
- Professional but approachable. No legal jargon.`;

export default function QuestionnairePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionIdParam = searchParams.get("session_id");

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [featureId, setFeatureId] = useState<string>("");
    const [featureName, setFeatureName] = useState<string>("New Feature");
    const [isDone, setIsDone] = useState(false);
    const [collectedData, setCollectedData] = useState<any>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Initialize session
    useEffect(() => {
        const currentUser = juraiStorage.getCurrentUser();
        if (!currentUser) {
            router.push("/login");
            return;
        }

        let sid = sessionIdParam;
        
        if (!sid) {
            sid = "feat_" + Math.random().toString(36).substring(2, 9);
            juraiStorage.saveSession({
                id: sid,
                userId: currentUser.id,
                name: "New Assessment",
                status: "pending",
                messages: []
            });
        } else {
            const session = juraiStorage.getSession(sid);
            if (session) {
                setFeatureName(session.name);
                if (session.messages?.length > 0) {
                    setMessages(session.messages);
                    return; // Don't add greeting if we have history
                }
            }
        }
        
        setFeatureId(sid);

        // Initial Greeting
        setMessages([
            {
                role: "assistant",
                content: "Greetings. I am the JurAI legal bot. I'm here to conduct a judicial-grade compliance review of your new feature. To begin, could you describe what this feature does and what its name is?",
                timestamp: new Date().toISOString()
            }
        ]);
    }, [sessionIdParam]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [input]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isTyping || isDone) return;

        const userMessage: Message = {
            role: "user",
            content: input.trim(),
            timestamp: new Date().toISOString()
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput("");
        setIsTyping(true);

        try {
            const response = await fetch(`${API_BASE_URL}/ai/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: updatedMessages.map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    system_prompt: INTAKE_SYSTEM_PROMPT
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "AI service error");
            }

            const botContent = data.content;
            if (!botContent) {
                throw new Error("Empty response from AI service");
            }

            // Check if AI sent the completion JSON
            if (botContent.includes('{"done": true')) {
                try {
                    const jsonString = botContent.match(/\{[\s\S]*\}/)?.[0];
                    if (jsonString) {
                        const parsed = JSON.parse(jsonString);
                        setIsDone(true);
                        setCollectedData(parsed);
                        
                        setMessages(prev => [...prev, {
                            role: "assistant",
                            content: parsed.summary || "Assessment complete. You may now run the analysis.",
                            timestamp: new Date().toISOString()
                        }]);
                        return;
                    }
                } catch (e) {
                    console.error("JSON Parse Error", e);
                }
            }

            const botMessage: Message = {
                role: "assistant",
                content: botContent,
                timestamp: new Date().toISOString()
            };

            setMessages(prev => {
                const updated = [...prev, botMessage];
                // Persist session
                const currentUser = juraiStorage.getCurrentUser();
                if (currentUser) {
                    juraiStorage.saveSession({
                        id: featureId,
                        userId: currentUser.id,
                        messages: updated
                    });
                }
                return updated;
            });
        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "I've encountered a connection issue. Please check your network and try again.",
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const runAnalysis = () => {
        // Collect all chat history for context
        const chatHistory = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
        
        const contextData = {
            feature_id: featureId,
            feature_name: collectedData?.collected?.feature_name || featureName,
            feature_description: collectedData?.collected?.feature_description || "",
            chat_history: chatHistory,
            collected: collectedData?.collected || {},
            summary: collectedData?.summary || "",
            timestamp: new Date().toISOString()
        };

        // Update feature status and name in Storage
        const currentUser = juraiStorage.getCurrentUser();
        if (currentUser) {
            juraiStorage.saveSession({
                id: featureId,
                userId: currentUser.id,
                status: "analyzing",
                name: contextData.feature_name,
                description: contextData.summary,
                messages: messages // Ensure messages are synced
            });
        }

        // Save context for Analysis Page
        localStorage.setItem("pipeline_context", JSON.stringify(contextData));
        router.push(`/analysis?feature_id=${featureId}`);
    };

    return (
        <div className="flex flex-col h-screen bg-[#0A0A0A] text-parchment font-sans overflow-hidden">
            <NavBar />
            
            {/* Context Header */}
            <div className="px-6 py-2 border-b border-white/5 bg-white/5 backdrop-blur-sm z-20 flex justify-between items-center h-12">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Counsel Intake</span>
                    <span className="text-[10px] font-mono text-slate-500">/</span>
                    <span className="text-[10px] font-mono text-teal uppercase tracking-widest truncate max-w-[150px]">{featureName}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
                    <span className="text-[10px] font-mono text-teal uppercase tracking-widest">Active Link</span>
                </div>
            </div>

            {/* Header */}
            <header className="px-6 py-4 border-b border-charcoal/10 dark:border-white/10 flex justify-between items-center bg-white/5 dark:bg-[#0A0A0A]/5 px-6 py-4 backdrop-blur-md z-20">
                <div className="flex items-center gap-4">
                    <Link href="/sessions" className="p-2 hover:bg-teal/10 rounded-full transition-colors group">
                        <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-teal" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal/10 border border-teal/30 rounded-lg flex items-center justify-center shadow-lg shadow-teal/20">
                            <Bot className="w-6 h-6 text-teal" />
                        </div>
                        <div>
                            <h1 className="font-serif text-lg font-bold text-teal leading-none">Compliance Assistant</h1>
                            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-1">ID: {featureId}</p>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={runAnalysis}
                    className="flex items-center gap-2 px-6 py-2 bg-teal text-parchment font-serif rounded-lg hover:bg-teal/90 transition-all shadow-lg shadow-teal/20"
                >
                    <Gavel className="w-4 h-4" />
                    <span>Finish & Run Analysis</span>
                </button>
            </header>

            {/* Chat Body */}
            <main className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth" ref={scrollRef}>
                <div className="max-w-3xl mx-auto py-10 space-y-10">
                    <AnimatePresence initial={false}>
                        {messages.map((msg, idx) => {
                            // Skip messages that are raw JSON (done markers)
                            if (msg.content.includes('{"done": true')) return null;

                            return (
                                <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn(
                                        "flex gap-4",
                                        msg.role === "user" ? "flex-row-reverse" : "flex-row"
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg shrink-0 flex items-center justify-center border",
                                        msg.role === "assistant" 
                                            ? "bg-teal/10 border-teal/20 text-teal" 
                                            : "bg-charcoal/10 border-charcoal/20 dark:bg-white/10 dark:border-white/20 text-slate-500"
                                    )}>
                                        {msg.role === "assistant" ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                                    </div>
                                    <div className={cn(
                                        "max-w-[80%] p-5 rounded-2xl text-base leading-relaxed font-light shadow-sm",
                                        msg.role === "assistant"
                                            ? "bg-white dark:bg-[#151515] border border-charcoal/5 dark:border-white/10 text-slate-700 dark:text-slate-300"
                                            : "bg-teal text-parchment"
                                    )}>
                                        {msg.content}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {isTyping && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex gap-4 items-center"
                        >
                            <div className="w-8 h-8 rounded-lg bg-teal/10 border border-teal/20 flex items-center justify-center text-teal">
                                <Bot className="w-5 h-5" />
                            </div>
                            <div className="flex gap-1.5 p-4 rounded-2xl bg-white dark:bg-[#151515] border border-charcoal/5 dark:border-white/10">
                                <div className="w-1.5 h-1.5 rounded-full bg-teal animate-bounce" style={{ animationDelay: "0ms" }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-teal animate-bounce" style={{ animationDelay: "150ms" }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-teal animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                        </motion.div>
                    )}

                    {isDone && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-8 rounded-3xl bg-teal/5 border border-teal/20 text-center space-y-6"
                        >
                            <div className="w-16 h-16 bg-teal rounded-2xl mx-auto flex items-center justify-center shadow-xl shadow-teal/20">
                                <ShieldCheck className="w-10 h-10 text-parchment" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-serif font-bold text-teal">Analysis Ready</h3>
                                <p className="text-slate-500 font-light max-w-md mx-auto">
                                    I've gathered all necessary details for your feature. We are now ready to conduct a full judicial review.
                                </p>
                            </div>
                            <button 
                                onClick={runAnalysis}
                                className="inline-flex items-center gap-3 px-10 py-4 bg-teal text-parchment font-serif text-lg rounded-xl hover:bg-teal/90 transition-all shadow-xl shadow-teal/30 group"
                            >
                                <Gavel className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                <span>Generate Compliance Report</span>
                            </button>
                        </motion.div>
                    )}
                </div>
            </main>

            {/* Input Area */}
            {!isDone && (
                <div className="p-6 border-t border-charcoal/10 dark:border-white/10 bg-white/30 dark:bg-[#0A0A0A]/30 backdrop-blur-md z-20">
                    <form 
                        onSubmit={handleSendMessage}
                        className="max-w-3xl mx-auto relative flex items-end gap-3"
                    >
                        <div className="flex-1 relative group">
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder="Type a message or describe your feature..."
                                className="w-full bg-white dark:bg-[#1E1E1E] border border-charcoal/20 dark:border-white/20 rounded-xl p-4 pr-14 text-base focus:ring-1 focus:ring-teal outline-none transition-all resize-none max-h-60 min-h-[56px] shadow-sm scrollbar-hide dark:placeholder:text-slate-600"
                                rows={1}
                            />
                            <div className="absolute right-3 bottom-3 flex items-center gap-2">
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isTyping}
                                    className={cn(
                                        "p-2 rounded-lg transition-all",
                                        input.trim() && !isTyping 
                                            ? "bg-teal text-parchment shadow-lg shadow-teal/20" 
                                            : "bg-slate-200 dark:bg-white/5 text-slate-400 cursor-not-allowed"
                                    )}
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </form>
                    <div className="max-w-3xl mx-auto mt-3 flex justify-center items-center gap-6 text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">
                        <span className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> GDPR Compliant</span>
                        <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Local AI (Ollama)</span>
                        <span className="flex items-center gap-1.5"><Scale className="w-3 h-3" /> Compliance Check</span>
                    </div>
                </div>
            )}

            {/* Background Decoration */}
            <div className="absolute inset-0 -z-10 pointer-events-none opacity-[0.03] dark:opacity-[0.05]">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#2DD4BF_1px,transparent_1px)] [background-size:24px_24px]" />
            </div>
        </div>
    );
}