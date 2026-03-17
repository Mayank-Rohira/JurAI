"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Scale, Mail, Lock, ChevronRight, User, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { juraiStorage } from "@/lib/storage";

export default function SignupPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const user = juraiStorage.registerUser(name, email, password);
            juraiStorage.loginUser(email, password); 
            router.push("/");
        } catch (err: any) {
            setError(err.message || "Registration failed. Account may already exist.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-parchment flex items-center justify-center p-6 relative overflow-hidden">
             {/* Background Image/Overlay */}
             <div className="absolute inset-0 z-0 opacity-40">
                <img 
                    src="/Users/mayank/.gemini/antigravity/brain/a154af0a-f80c-4e8a-bc4b-110319cac9fe/login_signup_hero_1773750024435.png" 
                    alt="Background" 
                    className="w-full h-full object-cover blur-sm"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-transparent to-[#050505]" />
            </div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 w-full max-w-md"
            >
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 bg-teal/20 rounded-full flex items-center justify-center mb-4 border border-teal/30">
                            <ShieldCheck className="w-8 h-8 text-teal" />
                        </div>
                        <h1 className="font-serif text-3xl font-bold tracking-tight">Sign Up</h1>
                        <p className="text-slate-400 text-sm mt-2">Create your compliance account</p>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-6">
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input 
                                    type="text" 
                                    required
                                    placeholder="Full Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-12 pr-4 py-3 focus:ring-1 focus:ring-teal outline-none transition-all placeholder:text-slate-600"
                                />
                            </div>

                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input 
                                    type="email" 
                                    required
                                    placeholder="Email Address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-12 pr-4 py-3 focus:ring-1 focus:ring-teal outline-none transition-all placeholder:text-slate-600"
                                />
                            </div>

                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input 
                                    type="password" 
                                    required
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-12 pr-4 py-3 focus:ring-1 focus:ring-teal outline-none transition-all placeholder:text-slate-600"
                                />
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-teal hover:bg-teal/90 text-parchment font-serif text-lg rounded-lg transition-all flex items-center justify-center gap-2 group shadow-lg shadow-teal/20"
                        >
                            {loading ? "Creating Account..." : "Sign Up"}
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/10 text-center">
                        <p className="text-slate-500 text-sm">
                            Already have an account? <Link href="/login" className="text-teal hover:underline font-medium">Login</Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
