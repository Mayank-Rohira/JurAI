"use client";

import { motion } from "framer-motion";
import { Settings, User, Shield, LogOut, ChevronRight, Trash2, Moon, AppWindow } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
    const router = useRouter();

    const resetData = () => {
        if (confirm("Are you sure you want to clear all local sessions and assessment data? This cannot be undone.")) {
            localStorage.clear();
            alert("Application data reset successfully.");
            router.push("/");
        }
    };

    const sections = [
        {
            title: "App Preferences",
            icon: AppWindow,
            items: [
                { label: "Appearance", desc: "Dark Mode (Locked)", value: "Dark", icon: Moon },
                { label: "AI Engine", desc: "Local Analytics", value: "Ollama (Llama 3.1)", icon: Settings }
            ]
        },
        {
            title: "Privacy & Data",
            icon: Shield,
            items: [
                { label: "Storage", desc: "Browser LocalStorage", value: "Active" },
                { label: "Compliance Cache", desc: "Temporary analysis data", value: "Clearable" }
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-parchment dark:bg-[#0A0A0A] text-charcoal dark:text-parchment font-sans">
            <header className="px-6 py-6 border-b border-charcoal/5 dark:border-white/5 flex items-center gap-4 bg-parchment/50 dark:bg-[#0A0A0A]/50 backdrop-blur-sm sticky top-0 z-10">
                <Link href="/sessions" className="p-2 hover:bg-teal/5 rounded-full transition-colors">
                    <ChevronRight className="w-5 h-5 text-teal rotate-180" />
                </Link>
                <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-teal" />
                    <span className="font-serif text-lg font-bold tracking-tight text-teal dark:text-parchment">Settings</span>
                </div>
            </header>

            <main className="max-w-3xl mx-auto p-6 space-y-12 py-12">
                <div className="space-y-2">
                    <h1 className="font-serif text-4xl text-teal dark:text-parchment">System Settings</h1>
                    <p className="text-slate-500 font-light">Manage your local JurAI laboratory environment.</p>
                </div>

                <div className="space-y-10">
                    {sections.map((section, idx) => (
                        <div key={idx} className="space-y-4">
                            <div className="flex items-center gap-2 px-2">
                                <section.icon className="w-4 h-4 text-teal/50" />
                                <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-slate-500">{section.title}</h2>
                            </div>
                            <div className="bg-white dark:bg-[#151515] border border-charcoal/10 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                                {section.items.map((item, i) => (
                                    <div key={i} className="p-5 flex items-center justify-between border-b border-charcoal/5 dark:border-white/5 last:border-0 hover:bg-teal/[0.02] transition-colors">
                                        <div className="flex items-center gap-4">
                                            {item.icon && <item.icon className="w-5 h-5 text-slate-400" />}
                                            <div>
                                                <h3 className="font-medium text-charcoal dark:text-parchment">{item.label}</h3>
                                                <p className="text-xs text-slate-500 font-light">{item.desc}</p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-mono text-teal bg-teal/5 px-3 py-1 rounded-full">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <Trash2 className="w-4 h-4 text-red-400" />
                            <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-red-400">Danger Zone</h2>
                        </div>
                        <div className="bg-red-50/50 dark:bg-red-900/5 border border-red-100 dark:border-red-900/20 rounded-2xl p-6 flex flex-col items-center text-center space-y-4">
                            <div className="space-y-1">
                                <h3 className="font-bold text-red-600 dark:text-red-400">Clear All Environment Data</h3>
                                <p className="text-sm text-red-600/60 dark:text-red-400/60 max-w-xs">This will permanently delete your session history and assessment records from this browser.</p>
                            </div>
                            <button 
                                onClick={resetData}
                                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-parchment rounded-xl text-sm font-medium transition-all shadow-lg shadow-red-600/20 flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Reset Laboratory Data
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="text-center pt-10">
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                        JurAI Core v1.4.2 &bull; Local Environment &bull; No External Connectivity
                    </p>
                </div>
            </main>
        </div>
    );
}
