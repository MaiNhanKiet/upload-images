"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/AppSidebar";

export default function AdminLayout({
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
        if (user?.role !== "admin") {
            router.push("/dashboard");
            return;
        }
    }, [isAuthenticated, user, router]);

    if (!isAuthenticated || user?.role !== "admin") {
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
