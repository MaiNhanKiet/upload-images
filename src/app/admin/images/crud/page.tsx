"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Edit, Trash2, Search } from "lucide-react";

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
}

export default function ImageCrudPage() {
    const [images, setImages] = useState<ImageMetadata[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingImage, setEditingImage] = useState<ImageMetadata | null>(null);
    const [editForm, setEditForm] = useState({
        originalName: "",
        userId: ""
    });
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

            // Fetch all users for dropdown
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

    async function updateImage(imageId: string) {
        try {
            const res = await fetch(`/api/admin/images/${imageId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(editForm)
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Cập nhật ảnh thành công");
                fetchData();
                setEditingImage(null);
                setEditForm({ originalName: "", userId: "" });
            } else {
                toast.error(data.error || "Có lỗi xảy ra");
            }
        } catch (error) {
            toast.error("Có lỗi xảy ra");
        }
    }

    async function deleteImage(imageId: string) {
        if (!confirm("Bạn có chắc muốn xóa ảnh này?")) return;

        try {
            const res = await fetch(`/api/admin/images/${imageId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Xóa ảnh thành công");
                fetchData();
            } else {
                toast.error(data.error || "Lỗi xóa ảnh");
            }
        } catch (error) {
            toast.error("Có lỗi xảy ra");
        }
    }

    function startEdit(image: ImageMetadata) {
        setEditingImage(image);
        setEditForm({
            originalName: image.originalName,
            userId: image.userId
        });
    }

    function getUserEmail(userId: string) {
        const user = users.find(u => u.id === userId);
        return user?.email || "Unknown";
    }

    const filteredImages = images.filter(image =>
        image.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getUserEmail(image.userId).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">CRUD Ảnh</h1>
                    <p className="text-zinc-600">Quản lý tất cả ảnh trong hệ thống</p>
                </div>

                {/* Search */}
                <Card className="mb-6">
                    <div className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                placeholder="Tìm kiếm theo tên ảnh hoặc email user..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </Card>

                {/* Edit Form */}
                {editingImage && (
                    <Card className="mb-6">
                        <div className="p-6">
                            <h2 className="text-lg font-semibold mb-4">Chỉnh sửa ảnh</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="originalName">Tên ảnh</Label>
                                    <Input
                                        id="originalName"
                                        value={editForm.originalName}
                                        onChange={(e) => setEditForm({ ...editForm, originalName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="userId">Chuyển cho user</Label>
                                    <select
                                        id="userId"
                                        value={editForm.userId}
                                        onChange={(e) => setEditForm({ ...editForm, userId: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    >
                                        {users.map(user => (
                                            <option key={user.id} value={user.id}>
                                                {user.email} ({user.role})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <Button onClick={() => updateImage(editingImage.id)}>
                                    Cập nhật
                                </Button>
                                <Button variant="outline" onClick={() => {
                                    setEditingImage(null);
                                    setEditForm({ originalName: "", userId: "" });
                                }}>
                                    Hủy
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Images Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {loading ? (
                        <div className="col-span-full text-center py-8">
                            <p>Đang tải...</p>
                        </div>
                    ) : filteredImages.length === 0 ? (
                        <div className="col-span-full text-center py-8">
                            <p className="text-zinc-600">
                                {searchTerm ? "Không tìm thấy ảnh nào" : "Chưa có ảnh nào"}
                            </p>
                        </div>
                    ) : (
                        filteredImages.map((image) => (
                            <Card key={image.id} className="overflow-hidden">
                                <div className="aspect-square">
                                    <img
                                        src={image.url}
                                        alt={image.originalName}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="p-4 space-y-2">
                                    <h3 className="font-medium truncate">{image.originalName}</h3>
                                    <p className="text-sm text-zinc-600">
                                        User: {getUserEmail(image.userId)}
                                    </p>
                                    <p className="text-sm text-zinc-600">
                                        {(image.size / 1024).toFixed(1)} KB
                                    </p>
                                    <p className="text-sm text-zinc-600">
                                        {new Date(image.uploadedAt).toLocaleDateString('vi-VN')}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => window.open(image.url, '_blank')}
                                        >
                                            Xem
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => startEdit(image)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => deleteImage(image.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
