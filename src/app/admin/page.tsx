"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, Users, ImageIcon, HardDrive } from "lucide-react";

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

interface User {
    id: string;
    email: string;
    role: string;
    createdAt: string;
}

export default function AdminDashboardPage() {
    const [images, setImages] = useState<ImageMetadata[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const { isAuthenticated, token, user } = useAuth();
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
        fetchData();
    }, [isAuthenticated, user, router]);

    async function fetchData() {
        try {
            // Fetch all images
            const imagesRes = await fetch("/api/admin/images", {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (imagesRes.status === 401) {
                toast.error("Phiên đăng nhập đã hết hạn");
                router.push("/login");
                return;
            }

            const imagesData = await imagesRes.json();
            if (imagesRes.ok) {
                setImages(imagesData.images || []);
            }

            // Fetch all users
            const usersRes = await fetch("/api/admin/users", {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            const usersData = await usersRes.json();
            if (usersRes.ok) {
                setUsers(usersData.users || []);
            }

        } catch (error) {
            toast.error("Có lỗi xảy ra");
        } finally {
            setLoading(false);
        }
    }

    // Calculate stats
    const totalImages = images.length;
    const totalSize = images.reduce((sum, img) => sum + img.size, 0);
    const totalUsers = users.length;
    const totalAdmins = users.filter(u => u.role === "admin").length;

    // Format file size
    function formatFileSize(bytes: number): string {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }

    return (
        <div className="p-4 sm:p-6 h-full overflow-auto">
            <div className="w-full">
                {/* Title moved to app header */}
                <div className="mb-4" />

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-zinc-600">Tổng số ảnh</p>
                                <p className="text-3xl font-bold text-blue-600">{totalImages}</p>
                            </div>
                            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <ImageIcon className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-zinc-600">Tổng kích thước ảnh</p>
                                <p className="text-3xl font-bold text-green-600">{formatFileSize(totalSize)}</p>
                            </div>
                            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <HardDrive className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-zinc-600">Tổng số User</p>
                                <p className="text-3xl font-bold text-purple-600">{totalUsers}</p>
                            </div>
                            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Users className="h-6 w-6 text-purple-600" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-zinc-600">Số Admin</p>
                                <p className="text-3xl font-bold text-orange-600">{totalAdmins}</p>
                            </div>
                            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                <BarChart3 className="h-6 w-6 text-orange-600" />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Images */}
                    <Card>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold">Ảnh gần đây</h2>
                                <Button variant="outline" onClick={() => router.push("/admin/images")}>
                                    Xem tất cả
                                </Button>
                            </div>
                            <div className="space-y-3">
                                {loading ? (
                                    <p className="text-center py-4">Đang tải...</p>
                                ) : images.length === 0 ? (
                                    <p className="text-center py-4 text-zinc-600">Chưa có ảnh nào</p>
                                ) : (
                                    images.slice(0, 5).map((image) => (
                                        <div key={image.id} className="flex items-center gap-3 p-3 rounded-lg border">
                                            <img
                                                src={image.url}
                                                alt={image.originalName}
                                                className="w-12 h-12 object-cover rounded"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{image.originalName}</p>
                                                <p className="text-sm text-zinc-600">
                                                    {formatFileSize(image.size)} • {new Date(image.uploadedAt).toLocaleDateString('vi-VN')}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Recent Users */}
                    <Card>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold">User gần đây</h2>
                                <Button variant="outline" onClick={() => router.push("/admin/users")}>
                                    Xem tất cả
                                </Button>
                            </div>
                            <div className="space-y-3">
                                {loading ? (
                                    <p className="text-center py-4">Đang tải...</p>
                                ) : users.length === 0 ? (
                                    <p className="text-center py-4 text-zinc-600">Chưa có user nào</p>
                                ) : (
                                    users.slice(0, 5).map((userItem) => (
                                        <div key={userItem.id} className="flex items-center gap-3 p-3 rounded-lg border">
                                            <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center">
                                                <Users className="h-6 w-6 text-zinc-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{userItem.email}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-1 rounded text-xs ${userItem.role === "admin"
                                                        ? "bg-purple-100 text-purple-800"
                                                        : "bg-blue-100 text-blue-800"
                                                        }`}>
                                                        {userItem.role}
                                                    </span>
                                                    <span className="text-sm text-zinc-600">
                                                        {new Date(userItem.createdAt).toLocaleDateString('vi-VN')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}