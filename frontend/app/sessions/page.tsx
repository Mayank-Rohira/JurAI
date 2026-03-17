"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Scale, 
    Plus, 
    Clock, 
    ChevronRight, 
    Shield, 
    AlertCircle, 
    CheckCircle2, 
    Trash2,
    Search,
    Filter,
    ArrowLeft
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { juraiStorage, Session } from "@/lib/storage";
import { NavBar } from "@/components/NavBar";

interface JuraiFeature {
    id: string;
    name: string;
    description: string;
    status: "pending" | "completed" | "analyzing";
    lastAnalysis?: string;
    lastRunId?: string;
    createdAt: string;
}

export default function SessionsPage() {
    const [features, setFeatures] = useState<JuraiFeature[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const currentUser = juraiStorage.getCurrentUser();
        if (currentUser) {
            const userSessions = juraiStorage.getSessions(currentUser.id);
            // Filter to only show sessions with messages
            const activeSessions = userSessions.filter(s => (s as any).messages?.length > 0);
            setFeatures(activeSessions as any);
        }
        setIsLoaded(true);
    }, []);

    const deleteSession = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (window.confirm("Are you sure you want to delete this compliance report? This action cannot be undone.")) {
            juraiStorage.deleteSession(id);
            setFeatures(features.filter(f => f.id !== id));
        }
    };

    const filteredFeatures = features.filter(f => 
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.description.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const getStatusIcon = (status: JuraiFeature["status"]) => {
        switch (status) {
            case "completed": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case "analyzing": return <div className="w-4 h-4 rounded-full border-2 border-teal border-t-transparent animate-spin" />;
            default: return <Clock className="w-4 h-4 text-amber-500" />;
        }
    };

    const getStatusText = (status: JuraiFeature["status"]) => {
        switch (status) {
            case "completed": return "Analysis Complete";
            case "analyzing": return "Analysis in Progress";
            default: return "Questionnaire Pending";
        }
    };

    if (!isLoaded) return null;

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-parchment selection:bg-teal/10 selection:text-teal font-sans">
            <NavBar />
            <main className="pt-32 pb-20 px-6">
                <div className="max-w-4xl mx-auto space-y-12">
                    {/* Welcome Section */}
                    <section className="space-y-4">
                        <h1 className="font-serif text-4xl text-teal dark:text-parchment tracking-tight">Past Analysis</h1>
                            Manage your compliance history. Start a new analysis or review past reports.
                    </section>

                    {/* Quick Access Grid */}
                    <section className="grid sm:grid-cols-1 gap-6">
                        <Link href="/questionnaire">
                            <motion.div 
                                whileHover={{ scale: 1.01, translateY: -2 }}
                                className="relative overflow-hidden bg-teal border border-teal/20 rounded-xl p-8 group cursor-pointer shadow-xl shadow-teal/20"
                            >
                                <div className="relative z-10 flex items-center justify-between">
                                    <div className="space-y-2">
                                        <div className="w-12 h-12 rounded-lg bg-parchment/10 flex items-center justify-center mb-4">
                                            <Plus className="w-8 h-8 text-parchment" />
                                        </div>
                                        <h2 className="font-serif text-2xl text-parchment">Start New Analysis</h2>
                                            Begin a fresh compliance review for your product feature.
                                    </div>
                                    <ChevronRight className="w-8 h-8 text-parchment/30 group-hover:text-parchment group-hover:translate-x-2 transition-all" />
                                </div>
                                {/* Background Decorative Elements */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                            </motion.div>
                        </Link>
                    </section>

                    {/* Previous Sessions Section */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between border-b border-charcoal/10 dark:border-white/10 pb-4">
                            <h2 className="font-serif text-2xl text-teal dark:text-parchment">Analysis History</h2>
                            <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">{features.length} Total Reports</span>
                        </div>

                        <div className="space-y-4">
                            {filteredFeatures.length > 0 ? (
                                filteredFeatures.map((feature) => (
                                    <Link 
                                        key={feature.id}
                                        href={
                                            feature.status === "completed" 
                                                ? `/verdict?feature_id=${feature.id}&run_id=${feature.lastRunId}`
                                                : feature.status === "analyzing"
                                                    ? `/analysis?feature_id=${feature.id}`
                                                    : `/questionnaire?session_id=${feature.id}`
                                        }
                                    >
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            whileHover={{ scale: 1.01 }}
                                            className="bg-white dark:bg-[#151515] border border-charcoal/10 dark:border-white/10 rounded-xl p-6 flex items-center justify-between gap-6 group hover:border-teal/30 transition-all shadow-sm"
                                        >
                                            <div className="flex items-center gap-5 flex-1 min-w-0">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-lg flex items-center justify-center shrink-0 border",
                                                    feature.status === "completed" ? "bg-green-500/10 border-green-500/20 text-green-500" :
                                                    feature.status === "analyzing" ? "bg-teal/10 border-teal/20 text-teal" :
                                                    "bg-amber-500/10 border-amber-500/20 text-amber-500"
                                                )}>
                                                    <Shield className="w-6 h-6" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-serif text-xl text-teal dark:text-parchment truncate mb-1">
                                                        {feature.name}
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-500 uppercase tracking-widest">
                                                        <span className="flex items-center gap-1.5 shrink-0">
                                                            {getStatusIcon(feature.status)}
                                                            {getStatusText(feature.status)}
                                                        </span>
                                                        <span className="flex items-center gap-1.5 shrink-0">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(feature.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={(e) => deleteSession(feature.id, e)}
                                                    className="p-3 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                                <div className="p-3 bg-charcoal/5 dark:bg-white/5 rounded-lg group-hover:bg-teal group-hover:text-parchment transition-all">
                                                    <ChevronRight className="w-5 h-5" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    </Link>
                                ))
                            ) : (
                                <div className="text-center py-20 border-2 border-dashed border-charcoal/10 dark:border-white/10 rounded-2xl">
                                    <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                                    <h3 className="font-serif text-xl text-slate-500">No Reports Found</h3>
                                    <p className="text-slate-600 dark:text-slate-400 font-light mt-2">
                                        You haven't started any compliance reviews yet.
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </main>

            {/* Background Decoration */}
            <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden opacity-30">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gold/10 rounded-full blur-[120px]" />
            </div>
        </div>
    );
}
