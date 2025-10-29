"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Pkg { name: string; bytes: number; }

export default function PackagesAdminPage() {
    const { isAuthenticated, user, token } = useAuth();
    const router = useRouter();
    const [packages, setPackages] = useState<Pkg[]>([
        { name: "Gói Cơ bản", bytes: 1 * 1024 * 1024 * 1024 },
        { name: "Gói Nâng cao", bytes: 5 * 1024 * 1024 * 1024 },
        { name: "Gói Pro", bytes: 20 * 1024 * 1024 * 1024 },
    ]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) { router.push("/login"); return; }
        if (user?.role !== "admin") { router.push("/dashboard"); return; }
        fetchData();
    }, [isAuthenticated, user, router]);

    async function fetchData() {
        try {
            const res = await fetch("/api/admin/packages", { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (res.ok && Array.isArray(data.packages) && data.packages.length) {
                setPackages(data.packages);
            }
        } catch { }
    }

    function parseMBToBytes(value: string): number {
        const n = parseFloat(value);
        if (Number.isNaN(n) || n <= 0) return 0;
        return n * 1024 * 1024; // MB -> bytes
    }

    function formatBytesHuman(bytes: number): string {
        const mb = bytes / (1024 * 1024);
        if (mb >= 1024) {
            const gb = mb / 1024;
            return `${gb}`;
        }
        return `${mb}`;
    }

    function unitLabel(bytes: number): string {
        const mb = bytes / (1024 * 1024);
        return mb >= 1024 ? 'GB' : 'MB';
    }

    async function save() {
        try {
            setLoading(true);
            const res = await fetch("/api/admin/packages", {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ packages }),
            });
            const data = await res.json();
            if (!res.ok) { toast.error(data.error || "Lưu thất bại"); return; }
            toast.success("Đã lưu gói dung lượng");
        } catch {
            toast.error("Có lỗi xảy ra");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-4 sm:p-6 h-full overflow-auto">
            <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-semibold">Cấu hình dung lượng gói</h1>
                    <Button onClick={save} disabled={loading}>{loading ? "Đang lưu..." : "Lưu"}</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {packages.map((pkg, idx) => (
                        <Card key={idx} className="p-4 space-y-3">
                            <div className="space-y-2">
                                <Label>Tên gói</Label>
                                <Input value={pkg.name} onChange={(e) => {
                                    const next = [...packages];
                                    next[idx] = { ...next[idx], name: e.target.value };
                                    setPackages(next);
                                }} />
                            </div>
                            <div className="space-y-2">
                                <Label>
                                    Dung lượng ({unitLabel(pkg.bytes)})
                                </Label>
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.5"
                                    value={(() => {
                                        const mb = pkg.bytes / (1024 * 1024);
                                        return mb >= 1024 ? (mb / 1024).toString() : mb.toString();
                                    })()}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const currentMb = pkg.bytes / (1024 * 1024);
                                        const isGB = currentMb >= 1024;
                                        const nextBytes = isGB
                                            ? parseMBToBytes(String(parseFloat(val) * 1024))
                                            : parseMBToBytes(val);
                                        const next = [...packages];
                                        next[idx] = { ...next[idx], bytes: nextBytes };
                                        setPackages(next);
                                    }}
                                />
                                <p className="text-xs text-zinc-500">
                                    Nhập theo MB; tự động hiển thị GB khi ≥ 1024 MB
                                </p>
                            </div>
                        </Card>
                    ))}
                </div>
            </Card>
        </div>
    );
}


