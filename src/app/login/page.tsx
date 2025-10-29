"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { login } = useAuth();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        try {
            setLoading(true);
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Đăng nhập thất bại");
                return;
            }

            toast.success("Đăng nhập thành công!");

            // Use AuthContext login method
            login(data.token, data.user);

            // Small delay to ensure context is updated
            setTimeout(() => {
                // Redirect based on role
                if (data.user.role === "admin") {
                    router.push("/admin");
                } else {
                    router.push("/dashboard");
                }
            }, 100);

        } catch (error) {
            toast.error("Có lỗi xảy ra");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-6">
            <Card className="w-full max-w-md p-6 space-y-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold">Đăng nhập</h1>
                    <p className="text-sm text-zinc-600 mt-2">
                        Đăng nhập vào tài khoản của bạn
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="your@email.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Mật khẩu</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="Nhập mật khẩu"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                    </Button>
                </form>

                <div className="text-center">
                    <p className="text-sm text-zinc-600">
                        Chưa có tài khoản?{" "}
                        <a href="/register" className="text-blue-600 hover:underline">
                            Đăng ký ngay
                        </a>
                    </p>
                </div>
            </Card>
        </div>
    );
}
