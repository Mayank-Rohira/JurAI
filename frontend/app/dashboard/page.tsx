"use client";

import { useState, useEffect } from "react";
import { Scale, Gavel, Plus, Search, Calendar, ChevronRight, CheckCircle2, AlertCircle, Clock, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";
import { getAllFeatures, FeatureContext, FeatureStage } from "@/lib/context";
import { cn } from "@/lib/utils";

const STAGE_MAP: Record<FeatureStage, { label: string, color: string, description: string }> = {
    1: { label: "Intake", color: "text-blue-500", description: "Initial requirements gathering" },
    2: { label: "Risk Pipeline", color: "text-amber-500", description: "Automated AI risk analysis" },
    3: { label: "Lawyer Verdict", color: "text-purple-500", description: "Human-in-the-loop review" },
    4: { label: "Post-Fix Review", color: "text-teal-500", description: "Verifying remediation" },
    5: { label: "Compliant", color: "text-emerald-500", description: "Ready for launch" }
};

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
    const { user, logout, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [features, setFeatures] = useState<FeatureContext[]>([]);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        const data = getAllFeatures();
        setFeatures(Object.values(data).sort((a, b) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        ));
        setIsLoading(false);
    }, []);

    const filteredFeatures = features.filter(f => 
        f.feature_name.toLowerCase().includes(search.toLowerCase())
    );

    if (authLoading) return <div className="min-h-screen bg-black" />;

    return (
        <div className="min-h-screen bg-parchment dark:bg-[#0A0A0A] text-charcoal dark:text-parchment font-sans pb-20">
            {/* Header */}
            <header className="px-6 py-4 border-b border-charcoal/5 dark:border-white/5 flex justify-between items-center bg-parchment/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center gap-2 group">
                        <Scale className="w-6 h-6 text-teal transition-transform group-hover:rotate-12" />
                        <span className="font-serif text-xl font-bold tracking-tight text-teal dark:text-parchment">JurAI</span>
                    </Link>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 mr-4 pr-4 border-r border-charcoal/10 dark:border-white/10 text-[10px] uppercase tracking-widest text-slate/40">
                        <User className="w-4 h-4" />
                        {user?.name || user?.email}
                        <button onClick={logout} className="hover:text-teal transition-colors ml-2 font-bold">LOGOUT</button>
                    </div>
                    <ThemeToggle />
                    <Link 
                        href="/questionnaire" 
                        className="bg-teal text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-teal/90 transition-all font-medium text-sm shadow-md"
                    >
                        <Plus className="w-4 h-4" />
                        NEW ASSESSMENT
                    </Link>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 pt-12">
                <div className="md:flex justify-between items-end mb-12">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-serif text-teal dark:text-parchment font-bold">Assessment History</h1>
                        <p className="text-slate/60 dark:text-slate/40 uppercase text-xs tracking-widest">History of compliance reviews and assessment activity.</p>
                    </div>
                    
                    <div className="mt-6 md:mt-0 relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate/40" />
                        <input 
                            type="text" 
                            placeholder="Search features..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#151515] border border-charcoal/10 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-teal/20 focus:border-teal outline-none transition-all"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-64 bg-white dark:bg-[#151515]/50 animate-pulse rounded-2xl border border-charcoal/5 dark:border-white/5" />
                        ))}
                    </div>
                ) : filteredFeatures.length === 0 ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-32 bg-white dark:bg-[#151515] rounded-3xl border-2 border-dashed border-charcoal/10 dark:border-white/10"
                    >
                        <div className="flex justify-center mb-6">
                            <div className="p-6 bg-teal/5 rounded-full">
                                <ShieldCheck className="w-16 h-16 text-teal/30" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-serif text-teal dark:text-parchment mb-2">No Assessments Found</h2>
                        <p className="text-slate/60 dark:text-slate/40 mb-8 max-w-sm mx-auto">
                            {search ? "Try a different search term or clear the filter." : "Get started by creating your first compliance assessment."}
                        </p>
                        {!search && (
                            <Link 
                                href="/questionnaire" 
                                className="inline-flex items-center gap-2 bg-teal text-white px-8 py-4 rounded-xl hover:bg-teal/90 transition-all font-serif text-lg shadow-xl"
                            >
                                <Plus className="w-5 h-5" />
                                Start Assessment
                            </Link>
                        )}
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence mode="popLayout">
                            {filteredFeatures.map((feature) => (
                                <motion.div
                                    key={feature.feature_id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    whileHover={{ y: -5 }}
                                    className="group"
                                >
                                    <Link href={`/analysis?feature_id=${feature.feature_id}`}>
                                        <div className="bg-white dark:bg-[#151515] border border-charcoal/10 dark:border-white/10 p-6 rounded-2xl shadow-sm hover:shadow-xl hover:border-teal/30 transition-all h-full flex flex-col">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="p-3 bg-teal/5 rounded-xl text-teal group-hover:bg-teal group-hover:text-white transition-colors">
                                                    <Gavel className="w-6 h-6" />
                                                </div>
                                                <div className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-charcoal/5 dark:bg-white/5", STAGE_MAP[feature.current_stage].color)}>
                                                    {STAGE_MAP[feature.current_stage].label}
                                                </div>
                                            </div>

                                            <div className="flex-1 space-y-2">
                                                <h3 className="text-xl font-serif text-teal dark:text-parchment leading-tight group-hover:text-teal group-hover:underline transition-all">
                                                    {feature.feature_name}
                                                </h3>
                                                <p className="text-sm text-slate/50 dark:text-slate/40 line-clamp-2">
                                                    {feature.intake.summary || "Awaiting intake completion..."}
                                                </p>
                                            </div>

                                            <div className="mt-8 space-y-4">
                                                <div className="w-full h-1.5 bg-charcoal/5 dark:bg-white/5 rounded-full overflow-hidden">
                                                    <motion.div 
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${(feature.current_stage / 5) * 100}%` }}
                                                        className="h-full bg-teal"
                                                    />
                                                </div>
                                                
                                                <div className="flex justify-between items-center text-[11px] text-slate/40">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(feature.updated_at).toLocaleDateString()}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Link 
                                                            href={`/timeline?feature_id=${feature.feature_id}`}
                                                            className="hover:text-teal transition-colors flex items-center gap-1"
                                                        >
                                                            ACTIVITY
                                                        </Link>
                                                        <div className="w-px h-2 bg-charcoal/10 dark:bg-white/10" />
                                                        <div className="flex items-center gap-1 group-hover:text-teal transition-colors">
                                                            DETAILS
                                                            <ChevronRight className="w-3 h-3" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </main>

            {/* Background Decoration */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-50 overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-teal/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-gold/5 blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2" />
            </div>
        </div>
    );
}