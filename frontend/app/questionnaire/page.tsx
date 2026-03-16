"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, Send, CheckCircle2, Gavel, Loader2, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { api, ChatMessage } from "@/lib/api";
import { createFeature, saveFeature } from "@/lib/context";

const SYSTEM_PROMPT = `You are JurAI's intake agent. Your job is to learn about a software product feature so a compliance analysis can be performed.

You ask ONE short question at a time. Never ask multiple questions in a single message. 
Each question must build naturally on the previous answer.

ADAPTIVE LOGIC:
- If the user is hesitant or "not willing to share" specific info, AGNOWLEDGE it politely and pivot.
- Instead of forcing the data, ask for "Hypothetical Proxies" or "Generic Categories" so you can still assess risk without the sensitive specifics.
- Figure out the root architectural problem even if specific data labels are withheld.

INFORMATION TO COLLECT:
- feature_name: What is the feature called?
- feature_description: What does it do? Who uses it?
- jurisdictions: Which countries/regions will it be available in?
- data_collected: What personal data does it collect or process?
- data_storage: How long is data stored and where?
- user_consent: Do users explicitly consent? Can they opt out?
- uses_ai: Does it use AI or automated decision-making?
- ai_impact: If AI: can it significantly affect users?
- law0_policies: Any internal company rules (vendor bans, data residency)?
- legal_concerns: Any known legal, privacy, or ethical concerns?

RULES:
- Keep questions short (1-2 sentences max).
- Ask one focused follow-up if an answer is vague, then move on.
- Once all topics are covered, output ONLY this JSON and nothing else:
  {"done": true, "summary": "<2-3 sentence plain English summary>", "collected": {"feature_name": "...", "feature_description": "...", "jurisdictions": "...", "data_collected": "...", "data_storage": "...", "user_consent": "...", "uses_ai": "...", "ai_impact": "...", "law0_policies": "...", "legal_concerns": "..."}}
- Never ask more than 12 questions total.
- Professional but approachable. No legal jargon.`;

import { useAuth } from "@/lib/auth";

export default function QuestionnairePage() {
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const [summary, setSummary] = useState("");
    const [collectedData, setCollectedData] = useState<Record<string, string>>({});
    const [featureId, setFeatureId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    // Initial greeting
    useEffect(() => {
        const startChat = async () => {
            setIsLoading(true);
            try {
                const response = await api.ai.chat({
                    messages: [],
                    system_prompt: SYSTEM_PROMPT + `\n\nSTART BY GREETING THE USER (${user?.name || "Counsel"}) AND ASKING THE FIRST QUESTION: 'What is the name of the feature we are initializing?'`
                });
                setMessages([{ role: "assistant", content: response.content }]);
            } catch (error) {
                console.error("Failed to start chat:", error);
                setMessages([{ role: "assistant", content: "I'm sorry, I'm having trouble connecting to the compliance engine. Please refresh and try again." }]);
            } finally {
                setIsLoading(false);
            }
        };
        startChat();
    }, [user]);

    const handleSend = async () => {
        if (!input.trim() || isLoading || isDone) return;

        const userMsg: ChatMessage = { role: "user", content: input };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput("");
        setIsLoading(true);

        try {
            const response = await api.ai.chat({
                messages: newMessages,
                system_prompt: SYSTEM_PROMPT
            });

            // Try to parse JSON for collection logic
            try {
                const currentText = response.content;
                const jsonMatch = currentText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const cleanJson = jsonMatch[0].replace(/^```json\s*/g, "").replace(/```\s*$/g, "");
                    const data = JSON.parse(cleanJson);
                    if (data.done) {
                        setIsDone(true);
                        setSummary(data.summary);
                        setCollectedData(data.collected);
                        
                        const feature = createFeature(data.collected.feature_name || "New Feature");
                        setFeatureId(feature.feature_id);
                        
                        saveFeature(feature.feature_id, {
                            intake: {
                                conversation: [...newMessages, { role: "assistant", content: response.content }],
                                collected: data.collected,
                                summary: data.summary,
                                completed_at: new Date().toISOString()
                            }
                        });
                    }
                }
            } catch (e) {
                // Not JSON or parse failed, treat as normal message
            }

            if (!isDone) {
                setMessages([...newMessages, { role: "assistant", content: response.content }]);
            }
        } catch (error) {
            console.error("Chat failed:", error);
            setMessages([...newMessages, { role: "assistant", content: "I'm sorry, I encountered an error. Please try sending your message again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = () => {
        if (!featureId) return;
        router.push(`/analysis?feature_id=${featureId}`);
    };

    return (
        <div className="min-h-screen bg-parchment dark:bg-[#0A0A0A] text-charcoal dark:text-parchment flex flex-col font-sans">
            {/* Minimal Header */}
            <header className="px-6 py-4 border-b border-charcoal/5 dark:border-white/5 flex justify-between items-center bg-parchment/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 hover:bg-teal/5 rounded-full transition-colors">
                        <ChevronLeft className="w-5 h-5 text-teal" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <Scale className="w-6 h-6 text-teal" />
                        <span className="font-serif text-xl font-bold tracking-tight text-teal dark:text-parchment">JurAI</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-widest text-slate/50 font-bold">
                        {isDone ? "Information Collected" : `Step ${Math.floor(messages.length / 2) + 1} of ~10`}
                    </span>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-3xl mx-auto w-full pb-32">
                <AnimatePresence mode="popLayout">
                    {messages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className={cn(
                                "flex w-full",
                                msg.role === "user" ? "justify-end" : "justify-start"
                            )}
                        >
                            <div className={cn(
                                "max-w-[85%] p-4 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed",
                                msg.role === "user" 
                                    ? "bg-teal text-parchment rounded-tr-none" 
                                    : "bg-white dark:bg-[#151515] border border-charcoal/10 dark:border-white/10 rounded-tl-none"
                            )}>
                                {msg.role === "assistant" && i === 0 && (
                                    <div className="flex items-center gap-2 mb-2 text-gold">
                                        <Gavel className="w-4 h-4" />
                                        <span className="text-[10px] uppercase tracking-widest">Compliance Assistant</span>
                                    </div>
                                )}
                                {msg.content.includes('"done": true') ? "Analysis preparation complete. Review the summary below." : msg.content}
                            </div>
                        </motion.div>
                    ))}
                    
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start"
                        >
                            <div className="bg-white dark:bg-[#151515] border border-charcoal/10 dark:border-white/10 p-4 rounded-2xl rounded-tl-none flex items-center gap-3">
                                <Loader2 className="w-4 h-4 text-teal animate-spin" />
                                <span className="text-sm font-medium text-slate/60">Thinking...</span>
                            </div>
                        </motion.div>
                    )}

                    {isDone && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white dark:bg-[#151515] border-2 border-teal/30 p-8 rounded-2xl shadow-2xl space-y-6 text-center"
                        >
                            <div className="flex justify-center">
                                <CheckCircle2 className="w-16 h-16 text-teal" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-serif text-2xl text-teal dark:text-parchment">Assessment Prepared</h3>
                                <p className="text-slate/60 dark:text-slate/40 text-sm leading-relaxed">
                                    {summary}
                                </p>
                            </div>
                            <button
                                onClick={handleSubmit}
                                className="w-full py-4 bg-teal text-parchment font-serif text-lg rounded-xl shadow-xl hover:bg-teal/90 transition-all transform hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-3"
                            >
                                <Gavel className="w-5 h-5" />
                                Begin Compliance Audit
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </main>

            {/* Fixed Input Bar */}
            {!isDone && (
                <div className="fixed bottom-0 left-0 w-full p-4 md:p-6 bg-parchment/80 dark:bg-[#0A0A0A]/80 backdrop-blur-xl border-t border-charcoal/5 dark:border-white/5 z-30">
                    <div className="max-w-3xl mx-auto flex gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            placeholder="Type your answer..."
                            disabled={isLoading}
                            className="flex-1 bg-white dark:bg-[#151515] border border-charcoal/10 dark:border-white/10 p-4 rounded-xl focus:ring-2 focus:ring-teal/20 focus:border-teal outline-none transition-all text-sm md:text-base"
                            autoFocus
                        />
                        <button
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="p-4 bg-teal text-parchment rounded-xl shadow-lg hover:bg-teal/90 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Background Decoration */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-teal/5 blur-[120px] rounded-full" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-gold/5 blur-[120px] rounded-full" />
            </div>
        </div>
    );
}