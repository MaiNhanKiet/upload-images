"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Edit, Trash2, Search, Upload, Calendar, User, ImageIcon, Maximize2, Eye, Link as LinkIcon } from "lucide-react";
import { buildImageUrlFromFileName } from "@/lib/images";
import { copyToClipboard } from "@/lib/utils";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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

export default function AdminImageManagementPage() {
    const [images, setImages] = useState<ImageMetadata[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [dateFilter, setDateFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [editingImage, setEditingImage] = useState<ImageMetadata | null>(null);
    const [totalImages, setTotalImages] = useState(0);
    const [editForm, setEditForm] = useState({
        originalName: "",
        userId: ""
    });
    const { isAuthenticated, token, user } = useAuth();
    const router = useRouter();
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [resizeImage, setResizeImage] = useState<ImageMetadata | null>(null);
    const [resizeForm, setResizeForm] = useState<{ width: string; height: string }>({ width: "", height: "" });
    const [origSize, setOrigSize] = useState<{ w: number; h: number } | null>(null);
    const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

    const imagesPerPage = 10; // 2 rows x 5 images per row

    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/login");
            return;
        }
        if (user?.role !== "admin") {
            router.push("/dashboard");
            return;
        }
        fetchData(currentPage);
    }, [isAuthenticated, user, router, currentPage]);

    async function fetchData(page: number = 1) {
        try {
            // Fetch images with pagination
            const imagesRes = await fetch(`/api/admin/images?page=${page}&limit=${imagesPerPage}`, {
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
                setTotalImages(imagesData.total || 0);
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

    async function deleteAllImages() {
        try {
            const ids = filteredImages.map(img => img.id);
            for (const id of ids) {
                try {
                    await fetch(`/api/admin/images/${id}`, {
                        method: "DELETE",
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                } catch { }
            }
            toast.success("Đã xóa các ảnh đã chọn theo bộ lọc");
            fetchData();
        } catch (e) {
            toast.error("Có lỗi xảy ra khi xóa tất cả");
        }
    }

    async function doResize(imageId: string) {
        try {
            const width = parseInt(resizeForm.width || '0', 10) || undefined;
            const height = parseInt(resizeForm.height || '0', 10) || undefined;
            if (!width && !height) {
                toast.error("Nhập width/height hợp lệ");
                return;
            }
            const res = await fetch(`/api/admin/images/${imageId}/resize`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ width, height })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Resize thành công");
                setResizeImage(null);
                setResizeForm({ width: "", height: "" });
                fetchData(currentPage);
            } else {
                toast.error(data.error || "Resize thất bại");
            }
        } catch (e) {
            toast.error("Có lỗi xảy ra");
        }
    }

    // Lấy kích thước gốc của ảnh khi mở popup resize
    useEffect(() => {
        if (!resizeImage) {
            setOrigSize(null);
            return;
        }
        const img = new Image();
        img.onload = () => {
            setOrigSize({ w: img.naturalWidth, h: img.naturalHeight });
        };
        img.src = resizeImage.url;
    }, [resizeImage]);

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

    // Filter images based on search and date
    const filteredImages = images.filter(image => {
        const matchesSearch = image.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            getUserEmail(image.userId).toLowerCase().includes(searchTerm.toLowerCase());

        const imageDate = new Date(image.uploadedAt);
        const now = new Date();
        let matchesDate = true;

        switch (dateFilter) {
            case "today":
                matchesDate = imageDate.toDateString() === now.toDateString();
                break;
            case "week":
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                matchesDate = imageDate >= weekAgo;
                break;
            case "month":
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                matchesDate = imageDate >= monthAgo;
                break;
            case "all":
            default:
                matchesDate = true;
                break;
        }

        return matchesSearch && matchesDate;
    });

    // Pagination (server-side total)
    const totalPages = Math.max(1, Math.ceil((totalImages || filteredImages.length) / imagesPerPage));
    const startIndex = (currentPage - 1) * imagesPerPage;
    const endIndex = startIndex + imagesPerPage;
    const currentImages = filteredImages; // server đã phân trang, chỉ lọc trên trang hiện tại

    // Format file size
    function formatFileSize(bytes: number): string {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }

    return (
        <>
            <div className="h-screen flex flex-col overflow-hidden">
                <div className="flex-1 p-0 sm:p-6 overflow-auto ">
                    <div className="w-full h-full flex flex-col">
                        {/* Spacing below app header */}
                        {/* Edit Form - Popup */}
                        <Sheet open={!!editingImage} onOpenChange={(open) => {
                            if (!open) {
                                setEditingImage(null);
                                setEditForm({ originalName: "", userId: "" });
                            }
                        }}>
                            <SheetContent side="right" className="sm:max-w-md">
                                <SheetHeader>
                                    <SheetTitle>Chỉnh sửa ảnh</SheetTitle>
                                </SheetHeader>
                                {editingImage && (
                                    <div className="p-4 pt-0 space-y-4">
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
                                            <Select value={editForm.userId} onValueChange={(value) => setEditForm({ ...editForm, userId: value })}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {users.map(user => (
                                                        <SelectItem key={user.id} value={user.id}>
                                                            {user.email} ({user.role})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex gap-2">
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
                                )}
                            </SheetContent>
                        </Sheet>

                        {/* Images Grid - 2 rows x 5 images */}
                        <Card className="flex-1 flex flex-col min-h-0">
                            <div className="px-4 flex flex-col flex-1 min-h-0">
                                {/* Filters */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    {/* Search */}
                                    <div className="space-y-2">
                                        <Label htmlFor="search">Tìm kiếm</Label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                            <Input
                                                id="search"
                                                placeholder="Tên ảnh hoặc email user..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="pl-10"
                                            />
                                        </div>
                                    </div>

                                    {/* Date Filter */}
                                    <div className="space-y-2">
                                        <Label htmlFor="dateFilter">Lọc theo ngày</Label>
                                        <Select value={dateFilter} onValueChange={setDateFilter}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Tất cả</SelectItem>
                                                <SelectItem value="today">Hôm nay</SelectItem>
                                                <SelectItem value="week">Tuần này</SelectItem>
                                                <SelectItem value="month">Tháng này</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Actions + So Anh */}
                                    <div className="flex items-center justify-end gap-3">
                                        <Button variant="destructive" onClick={() => setConfirmDeleteAll(true)} className="shrink-0">
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Xóa tất cả
                                        </Button>
                                        <Button onClick={() => router.push("/upload")} className="shrink-0">
                                            <Upload className="h-4 w-4 mr-2" />
                                            Upload ảnh mới
                                        </Button>
                                        <div className="flex items-center gap-2 py-2 px-4 bg-zinc-100 rounded-md border-2 border-zinc-200">
                                            <ImageIcon className="h-4 w-4 text-zinc-600" />
                                            <span className="text-sm font-medium text-zinc-600">{totalImages} ảnh</span>
                                        </div>
                                    </div>
                                </div>

                                {loading ? (
                                    <div className="text-center py-12">
                                        <p>Đang tải...</p>
                                    </div>
                                ) : currentImages.length === 0 ? (
                                    <div className="text-center py-12">
                                        <ImageIcon className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                                        <p className="text-zinc-600">
                                            {searchTerm || dateFilter !== "all" ? "Không tìm thấy ảnh nào" : "Chưa có ảnh nào"}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col min-h-0">
                                        {/* Render 2 rows */}
                                        <div className="flex-1 grid grid-rows-2 gap-4 min-h-0">
                                            {Array.from({ length: Math.ceil(currentImages.length / 5) }, (_, rowIndex) => (
                                                <div key={rowIndex} className="grid grid-cols-5 gap-4 min-h-0 items-stretch">
                                                    {currentImages.slice(rowIndex * 5, (rowIndex + 1) * 5).map((image) => (
                                                        <div key={image.id} className="group relative flex flex-col min-h-0 h-full">
                                                            <Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col gap-2 min-h-0 p-0 h-full">
                                                                <div className="flex-1 relative flex items-center justify-center min-h-0 h-[250px] bg-zinc-100 overflow-hidden">
                                                                    <img
                                                                        src={buildImageUrlFromFileName(image.fileName)}
                                                                        alt={image.originalName}
                                                                        className="w-full h-full object-cover object-center"
                                                                    />
                                                                </div>
                                                                <div className="px-4 shrink-0">
                                                                    <h3 className="font-medium text-sm truncate" title={image.originalName}>
                                                                        {image.originalName}
                                                                    </h3>
                                                                    <div className="flex items-center gap-1 text-xs text-zinc-600">
                                                                        <User className="h-3 w-3" />
                                                                        <span className="truncate">{getUserEmail(image.userId)}</span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between text-xs text-zinc-600">
                                                                        {/* Left side: Icon + Date */}
                                                                        <div className="flex items-center gap-1">
                                                                            <Calendar className="h-3 w-3" />
                                                                            <span className="truncate">{new Date(image.uploadedAt).toLocaleDateString('vi-VN')}</span>
                                                                        </div>
                                                                        {/* Right side: File size */}
                                                                        <span>{formatFileSize(image.size)}</span>
                                                                    </div>

                                                                    <div className="flex gap-2 p-3 justify-center">
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button size="sm" variant="secondary" onClick={() => window.open(buildImageUrlFromFileName(image.fileName), '_blank')}>
                                                                                    <Eye className="h-4 w-4" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>Xem ảnh</TooltipContent>
                                                                        </Tooltip>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button size="sm" variant="outline" onClick={async () => { const url = buildImageUrlFromFileName(image.fileName); const full = (typeof window !== 'undefined' ? window.location.origin : '') + url; await copyToClipboard(full); toast.success('Đã copy link ảnh'); }}>
                                                                                    <LinkIcon className="h-4 w-4" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>Copy link</TooltipContent>
                                                                        </Tooltip>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button size="sm" variant="outline" onClick={() => { setResizeImage(image); setResizeForm({ width: "", height: "" }); }}>
                                                                                    <Maximize2 className="h-4 w-4" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>Resize</TooltipContent>
                                                                        </Tooltip>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button size="sm" variant="outline" onClick={() => startEdit(image)}>
                                                                                    <Edit className="h-4 w-4" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>Chỉnh sửa</TooltipContent>
                                                                        </Tooltip>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button size="sm" variant="destructive" onClick={() => setConfirmDeleteId(image.id)}>
                                                                                    <Trash2 className="h-4 w-4" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>Xóa</TooltipContent>
                                                                        </Tooltip>
                                                                    </div>
                                                                </div>
                                                            </Card>
                                                        </div>
                                                    ))}
                                                    {/* Fill empty slots */}
                                                    {Array.from({ length: 5 - (currentImages.slice(rowIndex * 5, (rowIndex + 1) * 5).length) }, (_, emptyIndex) => (
                                                        <div key={`empty-${emptyIndex}`} className="min-h-0"></div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="mt-4 pt-4 border-t">
                                        <div className="flex justify-between items-center">
                                            <p className="text-sm text-zinc-600">
                                                Hiển thị {startIndex + 1}-{Math.min(endIndex, filteredImages.length)} trong {filteredImages.length} ảnh
                                            </p>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                    disabled={currentPage === 1}
                                                >
                                                    Trước
                                                </Button>
                                                <div className="flex gap-1">
                                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                        const pageNum = i + 1;
                                                        return (
                                                            <Button
                                                                key={pageNum}
                                                                variant={currentPage === pageNum ? "default" : "outline"}
                                                                size="sm"
                                                                onClick={() => setCurrentPage(pageNum)}
                                                            >
                                                                {pageNum}
                                                            </Button>
                                                        );
                                                    })}
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                    disabled={currentPage === totalPages}
                                                >
                                                    Sau
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
            {/* Confirm delete single */}
            <Sheet open={!!confirmDeleteId} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}>
                <SheetContent side="right" className="sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>Xóa ảnh</SheetTitle>
                        <SheetDescription>Bạn có chắc chắn muốn xóa ảnh này? Hành động không thể hoàn tác.</SheetDescription>
                    </SheetHeader>
                    <SheetFooter>
                        <div className="flex gap-2">
                            <Button variant="destructive" onClick={async () => { if (confirmDeleteId) { await deleteImage(confirmDeleteId); setConfirmDeleteId(null); } }}>Xóa</Button>
                            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Hủy</Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
            {/* Confirm delete all (filtered) */}
            <Sheet open={confirmDeleteAll} onOpenChange={setConfirmDeleteAll}>
                <SheetContent side="right" className="sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>Xóa tất cả ảnh</SheetTitle>
                        <SheetDescription>Bạn có chắc chắn muốn xóa toàn bộ ảnh đang hiển thị theo bộ lọc hiện tại?</SheetDescription>
                    </SheetHeader>
                    <SheetFooter>
                        <div className="flex gap-2">
                            <Button variant="destructive" onClick={async () => { await deleteAllImages(); setConfirmDeleteAll(false); }}>Xóa tất cả</Button>
                            <Button variant="outline" onClick={() => setConfirmDeleteAll(false)}>Hủy</Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Resize popup */}
            <Sheet open={!!resizeImage} onOpenChange={(open) => { if (!open) { setResizeImage(null); setResizeForm({ width: "", height: "" }); } }}>
                <SheetContent side="right" className="sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>Resize ảnh</SheetTitle>
                        <SheetDescription>Nhập kích thước muốn đổi. Bỏ trống 1 chiều để giữ tỉ lệ.</SheetDescription>
                    </SheetHeader>
                    <div className="p-4 pt-0 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="width">Width (px)</Label>
                            <Input
                                id="width"
                                value={resizeForm.width}
                                onChange={(e) => {
                                    const digits = e.target.value.replace(/[^0-9]/g, '');
                                    if (!origSize) { setResizeForm({ ...resizeForm, width: digits }); return; }
                                    if (digits === '') { setResizeForm({ ...resizeForm, width: '', height: resizeForm.height }); return; }
                                    const w = parseInt(digits, 10);
                                    if (!w || w <= 0) { setResizeForm({ ...resizeForm, width: '', height: '' }); return; }
                                    const h = Math.round((w * origSize.h) / origSize.w);
                                    setResizeForm({ width: String(w), height: String(h) });
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="height">Height (px)</Label>
                            <Input
                                id="height"
                                value={resizeForm.height}
                                onChange={(e) => {
                                    const digits = e.target.value.replace(/[^0-9]/g, '');
                                    if (!origSize) { setResizeForm({ ...resizeForm, height: digits }); return; }
                                    if (digits === '') { setResizeForm({ ...resizeForm, height: '', width: resizeForm.width }); return; }
                                    const h = parseInt(digits, 10);
                                    if (!h || h <= 0) { setResizeForm({ ...resizeForm, width: '', height: '' }); return; }
                                    const w = Math.round((h * origSize.w) / origSize.h);
                                    setResizeForm({ width: String(w), height: String(h) });
                                }}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => { if (resizeImage) doResize(resizeImage.id); }}>Thực hiện</Button>
                            <Button variant="outline" onClick={() => { setResizeImage(null); setResizeForm({ width: "", height: "" }); }}>Hủy</Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
