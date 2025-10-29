"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/AppSidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAuthenticated, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/login");
            return;
        }
    }, [isAuthenticated, router]);

    if (!isAuthenticated) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <h1 className="text-xl font-semibold">Đang chuyển hướng...</h1>
                </div>
            </div>
        );
    }

    return <AppSidebar>{children}</AppSidebar>;
}
