"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Edit, Trash2, Plus, Users } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface User {
    id: string;
    email: string;
    role: string;
    createdAt: string;
    storageMb?: number;
}

export default function UserManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [confirmDeleteUser, setConfirmDeleteUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        role: "user",
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
        fetchUsers();
    }, [isAuthenticated, user, router]);

    async function fetchUsers() {
        try {
            const res = await fetch("/api/admin/users", {
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
                setUsers(data.users || []);
            } else {
                toast.error(data.error || "Lỗi tải danh sách user");
            }
        } catch (error) {
            toast.error("Có lỗi xảy ra");
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        try {
            const url = editingUser ? `/api/admin/users/${editingUser.id}?email=${encodeURIComponent(editingUser.email)}` : "/api/admin/users";
            const method = editingUser ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(editingUser ? "Cập nhật user thành công" : "Tạo user thành công");
                fetchUsers();
                setEditingUser(null);
                setShowAddForm(false);
                setFormData({ email: "", password: "", role: "user" });
            } else {
                toast.error(data.error || "Có lỗi xảy ra");
            }
        } catch (error) {
            toast.error("Có lỗi xảy ra");
        }
    }

    async function deleteUser(userId: string, email?: string) {
        try {
            const qs = email ? `?email=${encodeURIComponent(email)}` : '';
            const res = await fetch(`/api/admin/users/${userId}${qs}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Xóa user thành công");
                fetchUsers();
                setConfirmDeleteUser(null);
            } else {
                toast.error(data.error || "Lỗi xóa user");
            }
        } catch (error) {
            toast.error("Có lỗi xảy ra");
        }
    }

    function startEdit(user: User) {
        setEditingUser(user);
        setFormData({
            email: user.email,
            password: "",
            role: user.role,
        });
        setShowAddForm(false);
    }

    return (
        <>
            <div className="p-4 sm:p-6 h-full overflow-auto">
                <div className="w-full">
                    {/* Spacing below app header */}
                    <div className="mb-6" />

                    {/* Add/Edit Form */}
                    {/* Add Form (inline) */}
                    {showAddForm && !editingUser && (
                        <Card className="mb-6">
                            <div className="p-6">
                                <h2 className="text-lg font-semibold mb-4">
                                    {editingUser ? "Chỉnh sửa User" : "Thêm User mới"}
                                </h2>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="role">Role</Label>
                                            <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="user">User</SelectItem>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">
                                            {editingUser ? "Mật khẩu mới (để trống nếu không đổi)" : "Mật khẩu"}
                                        </Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            required={!editingUser}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="submit">
                                            {editingUser ? "Cập nhật" : "Tạo User"}
                                        </Button>
                                        <Button type="button" variant="outline" onClick={() => {
                                            setShowAddForm(false);
                                            setEditingUser(null);
                                            setFormData({ email: "", password: "", role: "user" });
                                        }}>
                                            Hủy
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </Card>
                    )}

                    {/* Edit Form (sheet popup) */}
                    <Sheet open={!!editingUser} onOpenChange={(open) => {
                        if (!open) {
                            setEditingUser(null);
                            setFormData({ email: "", password: "", role: "user" });
                        }
                    }}>
                        <SheetContent side="right" className="sm:max-w-md">
                            <SheetHeader>
                                <SheetTitle>Chỉnh sửa User</SheetTitle>
                            </SheetHeader>
                            {editingUser && (
                                <div className="p-4 pt-0">
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="email">Email</Label>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="role">Role</Label>
                                                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="user">User</SelectItem>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="password">Mật khẩu mới (để trống nếu không đổi)</Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button type="submit">Cập nhật</Button>
                                            <Button type="button" variant="outline" onClick={() => {
                                                setEditingUser(null);
                                                setFormData({ email: "", password: "", role: "user" });
                                            }}>Hủy</Button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </SheetContent>
                    </Sheet>

                    {/* Users Table */}
                    <Card>
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold">Danh sách User</h2>
                                <Button onClick={() => {
                                    setShowAddForm(true);
                                    setEditingUser(null);
                                    setFormData({ email: "", password: "", role: "user" });
                                }}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Thêm User
                                </Button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b bg-zinc-50">
                                            <th className="text-left p-4 font-semibold">Email</th>
                                            <th className="text-center p-4 font-semibold">Role</th>

                                            <th className="text-left p-4 font-semibold">Ngày tạo</th>
                                            <th className="text-center p-4 font-semibold">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan={4} className="text-center p-12">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                                        <p className="text-zinc-600">Đang tải...</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : users.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="text-center p-12">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Users className="h-12 w-12 text-zinc-400" />
                                                        <p className="text-zinc-600">Chưa có user nào</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            users.map((userItem) => (
                                                <tr key={userItem.id} className="border-b hover:bg-zinc-50 transition-colors">
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center">
                                                                <Users className="h-5 w-5 text-zinc-600" />
                                                            </div>
                                                            <div>
                                                                <p className="font-medium">{userItem.email}</p>
                                                                <p className="text-sm text-zinc-600">ID: {userItem.id}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 flex items-center justify-center">
                                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${userItem.role === "admin"
                                                            ? "bg-purple-100 text-purple-800"
                                                            : "bg-blue-100 text-blue-800"
                                                            }`}>
                                                            {userItem.role === "admin" ? "Admin" : "User"}
                                                        </span>
                                                    </td>

                                                    <td className="p-4 items-center justify-center">
                                                        <div className="text-sm">
                                                            <p className="font-medium">{new Date(userItem.createdAt).toLocaleDateString('vi-VN')}</p>
                                                            <p className="text-zinc-600">{new Date(userItem.createdAt).toLocaleTimeString('vi-VN')}</p>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex gap-2 justify-center">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => startEdit(userItem)}
                                                                className="hover:bg-blue-50"
                                                            >
                                                                <Edit className="h-4 w-4 mr-1" />
                                                                Sửa
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => setConfirmDeleteUser(userItem)}
                                                                className="hover:bg-red-50"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-1" />
                                                                Xóa
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Confirm delete popup */}
            <Sheet open={!!confirmDeleteUser} onOpenChange={(open) => { if (!open) setConfirmDeleteUser(null); }}>
                <SheetContent side="right" className="sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>Xóa user</SheetTitle>
                    </SheetHeader>
                    {confirmDeleteUser && (
                        <div className="p-4 pt-0 space-y-4">
                            <p>Bạn có chắc chắn muốn xóa user này? Hành động không thể hoàn tác.</p>
                            <div className="p-3 bg-zinc-50 rounded border">
                                <div className="font-medium">{confirmDeleteUser?.email}</div>
                                <div className="text-sm text-zinc-600">ID: {confirmDeleteUser?.id}</div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="destructive" onClick={() => { if (confirmDeleteUser) deleteUser(confirmDeleteUser.id, confirmDeleteUser.email); }}>Xóa</Button>
                                <Button variant="outline" onClick={() => setConfirmDeleteUser(null)}>Hủy</Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </>
    );
}