"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, ImageIcon, Calendar, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

export default function UserImagesPage() {
    const { token } = useAuth();
    const router = useRouter();
    const [images, setImages] = useState<ImageMetadata[]>([]);
    const [totalImages, setTotalImages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [dateFilter, setDateFilter] = useState("all");
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

    const imagesPerPage = 10; // 2 rows x 5 per row

    useEffect(() => {
        async function fetchImages() {
            try {
                const res = await fetch(`/api/images?page=${currentPage}&limit=${imagesPerPage}`, { headers: { Authorization: `Bearer ${token}` } });
                const data = await res.json();
                if (res.ok) {
                    setImages(data.images || []);
                    setTotalImages(data.total || 0);
                }
            } finally {
                setLoading(false);
            }
        }
        fetchImages();
    }, [token, currentPage]);

    const filtered = useMemo(() => {
        const lower = searchTerm.toLowerCase();
        return images.filter((i) => {
            const matchesName = i.originalName.toLowerCase().includes(lower);
            const imageDate = new Date(i.uploadedAt);
            const now = new Date();
            let matchesDate = true;
            switch (dateFilter) {
                case "today":
                    matchesDate = imageDate.toDateString() === now.toDateString();
                    break;
                case "week": {
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    matchesDate = imageDate >= weekAgo;
                    break;
                }
                case "month": {
                    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    matchesDate = imageDate >= monthAgo;
                    break;
                }
                case "all":
                default:
                    matchesDate = true;
            }
            return matchesName && matchesDate;
        });
    }, [images, searchTerm, dateFilter]);

    // Server đã phân trang, chỉ lọc trên trang hiện tại
    const totalPages = Math.max(1, Math.ceil((totalImages || 0) / imagesPerPage));
    const currentImages = filtered;

    function formatFileSize(bytes: number): string {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }

    async function deleteImage(imageId: string) {
        try {
            const res = await fetch(`/api/images?id=${imageId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) {
                setImages(prev => prev.filter(i => i.id !== imageId));
            } else {
                alert(data.error || "Xóa ảnh thất bại");
            }
        } catch (e) {
            alert("Có lỗi xảy ra");
        }
    }

    async function deleteAllImages() {
        const ids = images.map(i => i.id);
        for (const id of ids) {
            try {
                const res = await fetch(`/api/images?id=${id}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                });
                // ignore individual failures to continue
            } catch { }
        }
        setImages([]);
        setCurrentPage(1);
    }

    return (
        <>
            <div className="p-4 sm:p-6 h-full overflow-auto">
                <Card className="flex-1 flex flex-col min-h-0">
                    <div className="px-4 flex flex-col flex-1 min-h-0">
                        {/* Toolbar: 1 hàng, có cuộn ngang khi tràn */}
                        <div className="mb-4">
                            <div className="flex items-end md:items-center gap-3 overflow-x-auto whitespace-nowrap pb-2 -mx-2 px-2">
                                <div className="space-y-2">
                                    <Label htmlFor="search">Tìm theo tên ảnh</Label>
                                    <div className="relative w-56 md:w-64">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                        <Input
                                            id="search"
                                            placeholder="Tên ảnh..."
                                            value={searchTerm}
                                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dateFilter">Lọc theo ngày</Label>
                                    <Select value={dateFilter} onValueChange={(val) => { setDateFilter(val); setCurrentPage(1); }}>
                                        <SelectTrigger className="w-36 md:w-40">
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
                                <div className="flex items-center gap-3 ml-auto">
                                    <Button variant="destructive" onClick={() => setConfirmDeleteAll(true)} className="shrink-0 flex items-center gap-2">
                                        <Trash2 className="h-4 w-4" /> Xóa tất cả ảnh
                                    </Button>
                                    <Button onClick={() => router.push("/upload")} className="shrink-0">Upload ảnh mới</Button>
                                    <div className="flex items-center gap-2 py-2 px-4 bg-zinc-100 rounded-md border-2 border-zinc-200">
                                        <ImageIcon className="h-4 w-4 text-zinc-600" />
                                        <span className="text-sm font-medium text-zinc-600">{totalImages} ảnh</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Grid 2x5 like admin */}
                        {loading ? (
                            <div className="text-center py-12">
                                <p>Đang tải...</p>
                            </div>
                        ) : currentImages.length === 0 ? (
                            <div className="text-center py-12">
                                <ImageIcon className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                                <p className="text-zinc-600">Không có ảnh phù hợp</p>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="flex-1 grid grid-rows-2 gap-4 min-h-0 overflow-auto">
                                    {Array.from({ length: Math.ceil(currentImages.length / 5) }, (_, row) => (
                                        <div key={row} className="grid grid-cols-5 gap-4 min-h-0 items-stretch">
                                            {currentImages.slice(row * 5, (row + 1) * 5).map((image) => (
                                                <div key={image.id} className="group relative flex flex-col min-h-0 h-full">
                                                    <Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col gap-2 min-h-0 p-0 h-full">
                                                        <div className="flex-1 relative flex items-center justify-center min-h-0 h-[250px] bg-zinc-100 overflow-hidden">
                                                            <img src={image.url} alt={image.originalName} className="w-full h-full object-cover object-center" />
                                                        </div>
                                                        <div className="px-4 shrink-0">
                                                            <h3 className="font-medium text-sm truncate" title={image.originalName}>{image.originalName}</h3>
                                                            <div className="flex items-center justify-between text-xs text-zinc-600">
                                                                <div className="flex items-center gap-1">
                                                                    <Calendar className="h-3 w-3" />
                                                                    <span className="truncate">{new Date(image.uploadedAt).toLocaleDateString('vi-VN')}</span>
                                                                </div>
                                                                <span>{formatFileSize(image.size)}</span>
                                                            </div>
                                                            <div className="flex gap-2 p-3 justify-center">
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button size="sm" variant="secondary" onClick={() => window.open(image.url, '_blank')}>Xem</Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Xem ảnh</TooltipContent>
                                                                </Tooltip>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button size="sm" variant="outline" onClick={() => { const full = (typeof window !== 'undefined' ? window.location.origin : '') + image.url; navigator.clipboard.writeText(full); }}>Share</Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Copy link</TooltipContent>
                                                                </Tooltip>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button size="sm" variant="destructive" onClick={() => setConfirmDeleteId(image.id)}>Xóa</Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Xóa</TooltipContent>
                                                                </Tooltip>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                </div>
                                            ))}
                                            {Array.from({ length: 5 - (currentImages.slice(row * 5, (row + 1) * 5).length) }, (_, i) => (
                                                <div key={`empty-${i}`} className="min-h-0"></div>
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
                                    <p className="text-sm text-zinc-600">Hiển thị {(currentPage - 1) * imagesPerPage + 1}-{Math.min(currentPage * imagesPerPage, totalImages)} trong {totalImages} ảnh</p>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Trước</Button>
                                        <div className="flex gap-1">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                const pageNum = i + 1;
                                                return (
                                                    <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(pageNum)}>{pageNum}</Button>
                                                );
                                            })}
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Sau</Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
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
            {/* Confirm delete all */}
            <Sheet open={confirmDeleteAll} onOpenChange={setConfirmDeleteAll}>
                <SheetContent side="right" className="sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>Xóa tất cả ảnh</SheetTitle>
                        <SheetDescription>Bạn có chắc chắn muốn xóa toàn bộ ảnh? Hành động không thể hoàn tác.</SheetDescription>
                    </SheetHeader>
                    <SheetFooter>
                        <div className="flex gap-2">
                            <Button variant="destructive" onClick={async () => { await deleteAllImages(); setConfirmDeleteAll(false); }}>Xóa tất cả</Button>
                            <Button variant="outline" onClick={() => setConfirmDeleteAll(false)}>Hủy</Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </>
    );
}


