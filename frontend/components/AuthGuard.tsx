"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { juraiStorage } from "@/lib/storage";

const PUBLIC_PATHS = ["/", "/login", "/signup"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        const checkAuth = () => {
            const user = juraiStorage.getCurrentUser();
            const isPublicPath = PUBLIC_PATHS.includes(pathname);

            if (!user && !isPublicPath) {
                // Not logged in and trying to access private path
                router.push("/login");
            } else {
                setIsAuthorized(true);
            }
        };

        checkAuth();
    }, [pathname, router]);

    // Show children only if authorized (to prevent flashes of private content)
    if (!isAuthorized && !PUBLIC_PATHS.includes(pathname)) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-teal border-t-transparent animate-spin" />
            </div>
        );
    }

    return <>{children}</>;
}
