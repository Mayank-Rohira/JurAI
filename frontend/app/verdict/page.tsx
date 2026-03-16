"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Scale,
    Shield,
    Gavel,
    FileText,
    Activity,
    Brain,
    Clock,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    X,
    FileCode,
    Globe,
    CheckCircle,
    XCircle,
    ClipboardCheck,
    Download,
    Zap,
    TrendingUp,
    ShieldAlert,
    Lock,
    Target,
    ArrowLeft,
    ScrollText,
    Hammer,
    ChevronRight,
    MessageSquareText
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { api } from "@/lib/api";
import { getFeature, saveFeature, FeatureContext } from "@/lib/context";

export default function VerdictPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const featureId = searchParams.get("feature_id");
    
    const [feature, setFeature] = useState<FeatureContext | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [verdictData, setVerdictData] = useState<any>(null);
    const [riskData, setRiskData] = useState<any>(null);
    const [agentNotes, setAgentNotes] = useState<any[]>([]);

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

        if (data.legal_review?.run_id) {
            fetchResults(data.feature_id, data.legal_review.run_id);
        } else {
            setIsLoading(false);
        }
    }, [featureId]);

    const fetchResults = async (fid: string, rid: string) => {
        try {
            const result = await api.pipeline.getResults(fid, rid);
            
            // Parse Verdict
            let parsedVerdict = result.verdict;
            if (typeof parsedVerdict === 'string') {
                try {
                    const cleanJson = parsedVerdict.replace(/```json/g, '').replace(/```/g, '').trim();
                    parsedVerdict = JSON.parse(cleanJson);
                } catch (e) {
                    parsedVerdict = { summary: result.verdict };
                }
            }
            setVerdictData(parsedVerdict);

            // Parse Risk
            let parsedRisk = result.risk_assessment;
            if (typeof parsedRisk === 'string') {
                try {
                    const cleanJson = parsedRisk.replace(/```json/g, '').replace(/```/g, '').trim();
                    parsedRisk = JSON.parse(cleanJson);
                } catch (e) {
                    parsedRisk = {};
                }
            }
            if (parsedRisk?.risk_assessment) parsedRisk = parsedRisk.risk_assessment;
            setRiskData(parsedRisk);

            // Extract Agent "Lawyer Notes" from trace
            const notes = (result.agent_trace || []).map((t: any) => ({
                agent: t.agent,
                content: t.content,
                timestamp: t.timestamp
            })).filter((n: any) => n.content);
            setAgentNotes(notes);

        } catch (e) {
            console.error("Failed to fetch results", e);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-parchment dark:bg-[#0A0A0A] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Scale className="w-12 h-12 text-teal animate-spin-slow" />
                    <p className="font-serif text-teal text-lg">Sealing Verdict Artifacts...</p>
                </div>
            </div>
        );
    }

    const issues = Array.isArray(verdictData?.issues) ? verdictData.issues : [];

    return (
        <div className="min-h-screen bg-parchment dark:bg-[#0A0A0A] text-charcoal dark:text-parchment font-sans pb-20">
            {/* Header */}
            <header className="px-6 py-4 border-b border-charcoal/5 dark:border-white/5 flex justify-between items-center bg-parchment/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <Link href={`/analysis?feature_id=${featureId}`} className="p-2 hover:bg-charcoal/5 dark:hover:bg-white/5 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate/50" />
                    </Link>
                    <div className="h-4 w-px bg-charcoal/10 dark:bg-white/10" />
                    <div className="flex items-center gap-2">
                        <Gavel className="w-5 h-5 text-teal" />
                        <h1 className="font-serif text-lg font-bold text-teal dark:text-parchment">{feature?.feature_name} — Final Verdict</h1>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 pt-12">
                {/* Hero Verdict Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-[#151515] border-2 border-teal rounded-[2rem] p-8 md:p-12 mb-12 shadow-2xl relative overflow-hidden"
                >
                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-teal/60 text-[10px] uppercase tracking-[0.2em] font-bold">
                                    <Brain className="w-3 h-3" />
                                    Consensus Reached
                                </div>
                                <h2 className="text-4xl md:text-5xl font-serif text-charcoal dark:text-parchment">
                                    {riskData?.overall_risk === 'Low' ? 'System compliant' : 'Remediation Required'}
                                </h2>
                            </div>
                            <div className="flex items-center gap-6 px-8 py-4 bg-teal/5 dark:bg-teal/10 rounded-2xl border border-teal/20">
                                <div className="text-center">
                                    <div className="text-[10px] uppercase text-slate/40 mb-1 font-bold">Risk Level</div>
                                    <div className={cn(
                                        "text-2xl font-serif font-bold",
                                        riskData?.overall_risk === 'High' ? 'text-red-500' : 'text-teal'
                                    )}>{riskData?.overall_risk || 'Evaluating'}</div>
                                </div>
                                <div className="w-px h-8 bg-teal/20" />
                                <div className="text-center">
                                    <div className="text-[10px] uppercase text-slate/40 mb-1 font-bold">Confidence</div>
                                    <div className="text-2xl font-serif font-bold text-teal">{Math.round((riskData?.confidence || 0) * 100)}%</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-charcoal/[0.02] dark:bg-white/[0.02] border border-charcoal/5 dark:border-white/5 rounded-2xl p-6 md:p-8">
                            <h3 className="text-xs font-bold text-teal uppercase tracking-widest mb-4 flex items-center gap-2">
                                <ScrollText className="w-4 h-4" />
                                Executive Summary
                            </h3>
                            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 font-serif leading-relaxed italic">
                                "{verdictData?.summary || "Analysis concluded with majority consensus."}"
                            </p>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Scale className="w-64 h-64" />
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    {/* Non-Compliance Observations */}
                    <div className="space-y-6">
                        <h3 className="font-serif text-xl border-l-4 border-red-500 pl-4">Detected Vulnerabilities</h3>
                        <div className="space-y-4">
                            {issues.length > 0 ? issues.map((issue: any, idx: number) => (
                                <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="bg-white dark:bg-[#151515] border border-charcoal/10 dark:border-white/10 p-5 rounded-2xl hover:border-red-500/30 transition-colors group"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded text-[10px] font-bold",
                                            issue.severity === 'High' ? "bg-red-500/10 text-red-500" : "bg-teal/10 text-teal"
                                        )}>
                                            {issue.severity}
                                        </span>
                                        <span className="text-[10px] text-slate/40 tracking-tighter uppercase font-bold">{issue.category}</span>
                                    </div>
                                    <h4 className="font-serif text-lg text-charcoal dark:text-parchment mb-2 group-hover:text-red-500 transition-colors">{issue.title}</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{issue.description}</p>
                                </motion.div>
                            )) : (
                                <div className="p-8 text-center border-2 border-dashed border-charcoal/5 rounded-2xl opacity-40">
                                    <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                                    <p className="font-serif">No major violations found</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Agent Opinions / Lawyer Notes */}
                    <div className="space-y-6">
                        <h3 className="font-serif text-xl border-l-4 border-teal pl-4">Agent Deliberations</h3>
                        <div className="space-y-4">
                            {agentNotes.map((note, idx) => (
                                <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="bg-white dark:bg-[#151515] border border-charcoal/10 dark:border-white/10 p-5 rounded-2xl relative overflow-hidden"
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center text-teal">
                                            <MessageSquareText className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase text-teal font-bold tracking-widest">{note.agent}</div>
                                            <div className="text-[10px] text-slate/40 font-bold">{new Date(note.timestamp).toLocaleTimeString()}</div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 font-serif leading-relaxed italic lowercase first-letter:uppercase">
                                        "{typeof note.content === 'string' ? note.content.substring(0, 180) : 'Detailed report submitted.'}..."
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Next Stage Selection */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-10 bg-teal/5 dark:bg-teal/10 border-2 border-teal/20 rounded-[2.5rem] mt-20">
                    <div className="space-y-2 text-center md:text-left">
                        <h3 className="text-2xl font-serif text-teal">Proceed to Remediation?</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                            Generate automated PRs and fixes based on the verdict findings to secure compliance.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <Link 
                            href={`/fixes?feature_id=${featureId}`}
                            className="bg-teal text-white px-8 py-4 rounded-2xl font-serif text-lg flex items-center gap-3 hover:scale-105 transition-transform"
                        >
                            <Hammer className="w-5 h-5" />
                            View Fixes
                            <ChevronRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}