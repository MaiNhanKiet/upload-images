"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";


export default function RegisterPage() {
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        confirmPassword: ""
    });
    const [loading, setLoading] = useState(false);

    const router = useRouter();
    const { login } = useAuth();


    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast.error("Mật khẩu xác nhận không khớp");
            return;
        }

        if (formData.password.length < 6) {
            toast.error("Mật khẩu phải có ít nhất 6 ký tự");
            return;
        }

        try {
            setLoading(true);
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password
                })
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Đăng ký thất bại");
                return;
            }

            toast.success("Đăng ký thành công!");

            // Use AuthContext login method
            login(data.token, data.user);

            // Small delay to ensure context is updated
            setTimeout(() => {
                router.push("/dashboard");
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
                    <h1 className="text-2xl font-bold">Đăng ký tài khoản</h1>
                    <p className="text-sm text-zinc-600 mt-2">
                        Tạo tài khoản mới để sử dụng hệ thống
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
                            placeholder="Ít nhất 6 ký tự"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="Nhập lại mật khẩu"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            required
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Đang đăng ký..." : "Đăng ký"}
                    </Button>
                </form>

                <div className="text-center">
                    <p className="text-sm text-zinc-600">
                        Đã có tài khoản?{" "}
                        <a href="/login" className="text-blue-600 hover:underline">
                            Đăng nhập ngay
                        </a>
                    </p>
                </div>
            </Card>
        </div>
    );
}
