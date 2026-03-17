"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, User, LogOut, LayoutDashboard, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { juraiStorage, User as UserType } from "@/lib/storage";
import { cn } from "@/lib/utils";

export function NavBar() {
    const [user, setUser] = useState<UserType | null>(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setUser(juraiStorage.getCurrentUser());
    }, []);

    const handleLogout = () => {
        juraiStorage.logout();
        setUser(null);
        router.push("/");
    };

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, ease: "circOut" }}
            className="fixed top-0 w-full z-50 bg-parchment/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md border-b border-charcoal/10 dark:border-white/10 px-6 py-4 flex justify-between items-center"
        >
            <div className="flex items-center gap-8">
                <Link href="/" className="flex items-center gap-2 group cursor-pointer">
                    <div className="relative">
                        <Scale className="w-6 h-6 text-teal transition-transform group-hover:rotate-12" />
                        <motion.div
                            className="absolute -top-1 -right-1 w-2 h-2 bg-gold rounded-full"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                        />
                    </div>
                    <span className="font-serif text-xl font-bold tracking-tight text-teal dark:text-parchment">JurAI</span>
                </Link>
                {user && (
                    <div className="hidden sm:flex items-center gap-6">
                        <Link href="/sessions" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-teal transition-colors flex items-center gap-1.5">
                            <LayoutDashboard className="w-4 h-4" />
                            Laboratory
                        </Link>
                        <Link href="/settings" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-teal transition-colors flex items-center gap-1.5">
                            <Settings className="w-4 h-4" />
                            Settings
                        </Link>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3">
                {user ? (
                    <div className="relative">
                        <button 
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal/5 border border-teal/20 hover:bg-teal/10 transition-all"
                        >
                            <div className="w-7 h-7 rounded-full bg-teal/20 flex items-center justify-center border border-teal/30">
                                <User className="w-4 h-4 text-teal" />
                            </div>
                            <span className="text-sm font-medium text-teal hidden md:block">{user.username}</span>
                        </button>

                        <AnimatePresence>
                            {showProfileMenu && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-40" 
                                        onClick={() => setShowProfileMenu(false)} 
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 mt-2 w-48 z-50 bg-[#151515] border border-white/10 rounded-xl shadow-2xl p-2"
                                    >
                                        <div className="px-3 py-2 mb-2 border-b border-white/5">
                                            <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">Counsel Profile</p>
                                            <p className="text-sm font-medium truncate">{user.email}</p>
                                        </div>
                                        <button 
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Terminate Session
                                        </button>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Link 
                            href="/sessions" 
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-teal dark:hover:text-teal hover:bg-teal/10 rounded-sm transition-all"
                        >
                            Past Analysis
                        </Link>
                        <Link 
                            href="/login"
                            className="text-sm font-medium text-teal px-4 py-2 hover:bg-teal/5 rounded-lg transition-colors"
                        >
                            Log In
                        </Link>
                        <Link 
                            href="/signup"
                            className="text-sm font-medium bg-teal text-parchment px-5 py-2 rounded-lg shadow-lg hover:shadow-teal/20 transition-all font-serif"
                        >
                            Request Access
                        </Link>
                    </div>
                )}
            </div>
        </motion.nav>
    );
}
