"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface ImageMetadata {
    id: string;
    userId: string;
    originalName: string;
    fileName: string;
    url: string;
    size: number;
    type: string;
    uploadedAt: string;
}

export default function DashboardPage() {
    const [images, setImages] = useState<ImageMetadata[]>([]);
    const [loading, setLoading] = useState(true);
    const { isAuthenticated, token, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/login");
            return;
        }
        fetchImages();
    }, [isAuthenticated, router]);

    async function fetchImages() {
        try {
            const res = await fetch("/api/images", {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (res.status === 401) {
                toast.error("Phiên đăng nhập đã hết hạn");
                router.push("/login");
                return;
            }

            const data = await res.json();
            if (res.ok) {
                setImages(data.images || []);
            } else {
                toast.error(data.error || "Lỗi tải danh sách ảnh");
            }
        } catch (error) {
            toast.error("Có lỗi xảy ra");
        } finally {
            setLoading(false);
        }
    }

    async function deleteImage(imageId: string) {
        try {
            const res = await fetch(`/api/images?id=${imageId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (res.status === 401) {
                toast.error("Phiên đăng nhập đã hết hạn");
                router.push("/login");
                return;
            }

            const data = await res.json();
            if (res.ok) {
                toast.success("Xóa ảnh thành công");
                setImages(images.filter(img => img.id !== imageId));
            } else {
                toast.error(data.error || "Lỗi xóa ảnh");
            }
        } catch (error) {
            toast.error("Có lỗi xảy ra");
        }
    }

    const totalBytes = images.reduce((total, img) => total + img.size, 0);
    const totalMbUsed = totalBytes / 1024 / 1024;
    const quotaMb = (user as any)?.storageMb ?? 1024;
    const percent = Math.min(100, Math.round((totalMbUsed / Math.max(1, quotaMb)) * 100));

    return (
        <div className="p-4 sm:p-6 h-full overflow-hidden">
            <div className="w-full">
                <div className="mb-2" />

                {/* Usage */}
                <Card className="p-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-zinc-600">Đã sử dụng</p>
                            <p className="text-2xl font-bold">{totalMbUsed.toFixed(1)} MB / {quotaMb} MB</p>
                        </div>
                        <Button onClick={() => router.push("/upload")}>Upload ảnh mới</Button>
                    </div>
                    <div className="mt-4 h-3 w-full bg-zinc-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600" style={{ width: `${percent}%` }} />
                    </div>
                </Card>

                {/* Upload count and recent 5 horizontal */}
                <Card>
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-zinc-600">Ảnh đã upload: <span className="font-semibold">{images.length}</span></p>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => router.push("/dashboard/images")}>Xem thêm</Button>
                                <Button onClick={() => router.push("/upload")}>Upload ảnh mới</Button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center py-8"><p>Đang tải...</p></div>
                        ) : images.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-zinc-600">Chưa có ảnh nào</p>
                                <Button onClick={() => router.push("/upload")} className="mt-4">Upload ảnh đầu tiên</Button>
                            </div>
                        ) : (
                            <div className="flex gap-4 overflow-x-auto py-2">
                                {images.slice(0, 5).map((image) => (
                                    <div key={image.id} className="w-[200px] flex-none">
                                        <Card className="overflow-hidden h-full">
                                            <div className="w-full h-[140px] bg-zinc-100 overflow-hidden">
                                                <img src={image.url} alt={image.originalName} className="w-full h-full object-cover object-center" />
                                            </div>
                                            <div className="p-3">
                                                <p className="text-sm font-medium truncate" title={image.originalName}>{image.originalName}</p>
                                            </div>
                                        </Card>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
