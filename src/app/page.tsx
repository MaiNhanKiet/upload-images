"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    } else if (user?.role === "admin") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
  }, [isAuthenticated, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Đang chuyển hướng...</h1>
        <p className="text-sm text-zinc-600 mt-2">Vui lòng chờ trong giây lát</p>
      </div>
    </div>
  );
}
