"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Scale,
    Shield,
    CheckCircle2,
    ChevronRight,
    Gavel,
    FileText,
    Activity,
    Brain,
    Clock,
    ScrollText,
    Search,
    Hammer,
    Home,
    ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { api, API_BASE_URL } from "@/lib/api";
import { getFeature, saveFeature, FeatureContext, updateStage } from "@/lib/context";

// --- Agents ---
const AGENTS = [
    {
        name: "Regulatory Advisor",
        title: "Compliance",
        icon: Shield,
        id: "REG-001",
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/20",
        position: { x: "left-8", y: "top-8" },
        role: "Analyzes regulatory compliance with GDPR, CCPA, and more."
    },
    {
        name: "Design Reviewer",
        title: "UX Ethics",
        icon: Scale,
        id: "CRT-009",
        color: "text-purple-500",
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/20",
        position: { x: "right-8", y: "top-8" },
        role: "Reviews for unethical dark patterns and deceptive practices."
    },
    {
        name: "Compliance Lead",
        title: "Lead Counsel",
        icon: Gavel,
        id: "JDG-100",
        color: "text-teal",
        bgColor: "bg-teal/10",
        borderColor: "border-teal/20",
        position: { x: "left-1/2", y: "top-8" },
        role: "Delivers final compliance review."
    },
];

export default function AnalysisPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const featureId = searchParams.get("feature_id");
    
    const [feature, setFeature] = useState<FeatureContext | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [activeThinker, setActiveThinker] = useState<string | null>(null);
    const [currentStatus, setCurrentStatus] = useState("Initializing System...");
    const [agentThoughts, setAgentThoughts] = useState<{ [key: string]: string[] }>({
        "REG-001": [],
        "CRT-009": [],
        "JDG-100": []
    });

    const thoughtRefs = {
        "REG-001": useRef<HTMLDivElement>(null),
        "CRT-009": useRef<HTMLDivElement>(null),
        "JDG-100": useRef<HTMLDivElement>(null)
    };

    const getAgentIdFromName = (name: string) => {
        if (name.includes("Jury") || name.includes("Primary")) return "REG-001";
        if (name.includes("Critic") || name.includes("Reviewer")) return "CRT-009";
        if (name.includes("Judge")) return "JDG-100";
        return "REG-001";
    };

    useEffect(() => {
        if (!featureId) {
            router.push("/dashboard");
            return;
        }

        const data = getFeature(featureId);
        if (!data) {
            router.push("/dashboard");
            return;
        }
        setFeature(data);

        // If stage is 1 (Intake done) and not already analyzing, start it
        if (data.current_stage === 1 && !analyzing) {
            startAnalysis(data);
        } else if (data.current_stage >= 2 && data.legal_review?.run_id) {
            // Already analyzed, load results
            setAnalyzing(false);
            setCurrentStatus("Analysis complete.");
            loadExistingResults(data);
        }
    }, [featureId]);

    const loadExistingResults = async (f: FeatureContext) => {
        if (!f.legal_review?.run_id) return;
        try {
            const result = await api.pipeline.getResults(f.feature_id, f.legal_review.run_id);
             if (result.agent_trace && Array.isArray(result.agent_trace)) {
                const thoughts: any = { "REG-001": [], "CRT-009": [], "JDG-100": [] };
                result.agent_trace.forEach((traceItem: any) => {
                    const agentId = getAgentIdFromName(traceItem.agent);
                    if (traceItem.logs) thoughts[agentId].push(...traceItem.logs);
                });
                setAgentThoughts(thoughts);
            }
        } catch (e) {
            console.error("Failed to load existing results", e);
        }
    };

    const startAnalysis = async (f: FeatureContext) => {
        setAnalyzing(true);
        setCurrentStatus("Gathering context for the Jury...");

        try {
            // Context for the backend pipeline
            const contextData = {
                feature_name: f.feature_name,
                collected_data: f.intake.collected,
                summary: f.intake.summary,
            };

            const response = await fetch(`${API_BASE_URL}/stream/pipeline`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(contextData)
            });

            if (!response.body) throw new Error("No stream body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                let lines = buffer.split("\n");
                buffer = lines.pop() || "";

                let currentEventType = "message";

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) continue;

                    if (trimmedLine.startsWith("event:")) {
                        currentEventType = trimmedLine.substring(6).trim();
                    } else if (trimmedLine.startsWith("data:")) {
                        const dataStr = trimmedLine.substring(5).trim();

                        try {
                            if (currentEventType === "done") {
                                const payload: any = JSON.parse(dataStr);
                                finalizeAnalysis(f.feature_id, payload);
                                return;
                            } else if (currentEventType === "status") {
                                setCurrentStatus(JSON.parse(dataStr) as string);
                            } else if (currentEventType.includes("_thinking")) {
                                const payload: any = JSON.parse(dataStr);
                                const agentId = getAgentIdFromName(currentEventType);
                                setActiveThinker(agentId);
                                if (payload.is_log) {
                                    setAgentThoughts(prev => ({
                                        ...prev,
                                        [agentId]: [...prev[agentId], payload.msg]
                                    }));
                                }
                            }
                        } catch (e) { console.error("Parse error", e); }
                    }
                }
            }
        } catch (e) {
            console.error("Stream failed", e);
            setAnalyzing(false);
            setCurrentStatus("Analysis failed. System connection error.");
        }
    };

    const finalizeAnalysis = (fid: string, payload: any) => {
        setAnalyzing(false);
        setCurrentStatus("Analysis complete.");
        
        // Save to FeatureContext
        saveFeature(fid, {
            current_stage: 2,
            legal_review: {
                run_id: payload.run_id,
                verdict: payload.verdict,
                risk_assessment: payload.risk,
                submitted_at: new Date().toISOString(),
                approved: false
            }
        });

        // Trigger autofix in background
        api.pipeline.runAutofix(fid, payload.run_id);
    };

    return (
        <div className="min-h-screen bg-parchment dark:bg-[#0A0A0A] text-charcoal dark:text-parchment font-sans pb-20">
            {/* Header */}
            <header className="px-6 py-4 border-b border-charcoal/5 dark:border-white/5 flex justify-between items-center bg-parchment/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <Link href="/dashboard" className="p-2 hover:bg-charcoal/5 dark:hover:bg-white/5 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate/50" />
                    </Link>
                    <div className="h-4 w-px bg-charcoal/10 dark:bg-white/10" />
                    <div className="flex items-center gap-2">
                        <Scale className="w-5 h-5 text-teal" />
                        <h1 className="font-serif text-lg font-bold text-teal dark:text-parchment line-clamp-1">{feature?.feature_name}</h1>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Link 
                        href={`/report?feature_id=${featureId}`}
                        className="flex items-center gap-2 px-4 py-2 bg-charcoal dark:bg-parchment text-white dark:text-black rounded-lg hover:scale-105 transition-all text-sm font-bold shadow-xl"
                    >
                        <FileText className="w-4 h-4" />
                        GENERATE REPORT
                    </Link>
                    <ThemeToggle />
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 pt-24">
                {/* Status Indicator */}
                <div className="flex justify-center mb-16">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                            "px-6 py-3 rounded-full border flex items-center gap-3 shadow-xl backdrop-blur-md transition-all duration-500",
                            analyzing ? "bg-white/80 dark:bg-[#151515]/80 border-teal/20" : "bg-teal text-white border-transparent"
                        )}
                    >
                        {analyzing ? (
                            <>
                                <Activity className="w-4 h-4 text-teal animate-pulse" />
                                <span className="text-sm uppercase tracking-[0.2em] text-teal">Analysis in Progress...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-sm uppercase tracking-[0.2em]">Analysis Complete</span>
                            </>
                        )}
                    </motion.div>
                </div>

                {/* Agents Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
                    {AGENTS.map((agent) => (
                        <div key={agent.id} className="space-y-6">
                            <div className="flex flex-col items-center gap-4">
                                <motion.div
                                    animate={activeThinker === agent.id ? {
                                        scale: [1, 1.05, 1],
                                        boxShadow: ["0 0 0px rgba(13,148,136,0)", "0 0 30px rgba(13,148,136,0.3)", "0 0 0px rgba(13,148,136,0)"]
                                    } : {}}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className={cn(
                                        "w-24 h-24 rounded-3xl border-2 flex items-center justify-center bg-white dark:bg-[#111] transition-all duration-500",
                                        agent.borderColor,
                                        activeThinker === agent.id && "ring-4 ring-teal/20"
                                    )}
                                >
                                    <agent.icon className={cn("w-10 h-10", agent.color)} />
                                </motion.div>
                                <div className="text-center">
                                    <h3 className={cn("font-serif text-xl font-bold", agent.color)}>{agent.title}</h3>
                                    <p className="text-[10px] uppercase tracking-widest text-slate/40">{agent.name}</p>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-[#151515] border border-charcoal/10 dark:border-white/10 rounded-2xl h-[400px] overflow-hidden flex flex-col shadow-sm">
                                <div className="p-3 border-b border-charcoal/5 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Brain className="w-3.5 h-3.5 text-teal" />
                                        <span className="text-[10px] font-bold text-teal uppercase tracking-widest">Analysis Context</span>
                                    </div>
                                    {activeThinker === agent.id && (
                                        <div className="flex gap-1">
                                            <div className="w-1 h-1 rounded-full bg-teal animate-bounce" style={{ animationDelay: '0s' }} />
                                            <div className="w-1 h-1 rounded-full bg-teal animate-bounce" style={{ animationDelay: '0.2s' }} />
                                            <div className="w-1 h-1 rounded-full bg-teal animate-bounce" style={{ animationDelay: '0.4s' }} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 text-[11px] leading-relaxed space-y-3 custom-scrollbar">
                                    <AnimatePresence>
                                        {agentThoughts[agent.id].length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center opacity-20 select-none">
                                                <Brain className="w-12 h-12 mb-4" />
                                                <p>Waiting to process...</p>
                                            </div>
                                        ) : (
                                            agentThoughts[agent.id].map((thought: string, idx: number) => (
                                                <motion.div
                                                    key={idx}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="pl-3 border-l border-teal/20 text-slate/60 dark:text-slate/40"
                                                >
                                                    {thought}
                                                </motion.div>
                                            ))
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Transition */}
                <div className="max-w-3xl mx-auto text-center space-y-12">
                    <div className="bg-white/50 dark:bg-[#151515]/50 border border-charcoal/10 dark:border-white/10 p-6 rounded-2xl flex items-center justify-center gap-4">
                        <ScrollText className="w-5 h-5 text-teal" />
                        <p className="text-sm font-medium text-slate/70 dark:text-slate/30">{currentStatus}</p>
                    </div>

                    {!analyzing && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-[#151515] border-2 border-teal p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group"
                        >
                            <div className="relative z-10 space-y-6">
                                <div className="p-4 bg-teal/10 rounded-full w-fit mx-auto">
                                    <Hammer className="w-10 h-10 text-teal" />
                                </div>
                                <h2 className="text-3xl font-serif text-teal dark:text-parchment">Analysis Complete</h2>
                                <p className="text-slate/60 dark:text-slate/40 max-w-md mx-auto">
                                    The JurAI analysis engine has completed its review. Review the final findings and recommendations.
                                </p>
                                <Link
                                    href={`/verdict?feature_id=${featureId}`}
                                    className="inline-flex items-center gap-4 bg-teal text-white px-10 py-5 rounded-2xl font-serif text-xl shadow-xl hover:shadow-teal/40 transition-all hover:scale-[1.02]"
                                >
                                    View Final Findings
                                    <ChevronRight className="w-5 h-5" />
                                </Link>
                            </div>
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <Scale className="w-48 h-48" />
                            </div>
                        </motion.div>
                    )}
                </div>
            </main>
        </div>
    );
}