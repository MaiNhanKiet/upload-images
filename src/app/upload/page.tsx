"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/AppSidebar";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [url, setUrl] = useState<string>("");
  const [multiResults, setMultiResults] = useState<
    Array<{ name: string; url: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated, token, logout, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  async function handleUpload() {
    try {
      setError("");
      setUrl("");
      setMultiResults([]);
      const isMulti = isAdmin && files.length > 1;
      if (!isMulti && !file) {
        setError("Vui lòng chọn ảnh");
        return;
      }
      const form = new FormData();
      if (isMulti) {
        for (const f of files) form.append("files", f);
      } else if (file) {
        form.append("files", file);
      }
      setLoading(true);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Upload lỗi");
        toast.error(data?.error || "Upload lỗi");
        if (res.status === 401) {
          logout();
        }
        return;
      }
      if (data?.results && Array.isArray(data.results)) {
        setMultiResults(
          data.results.map((r: any) => ({ name: r.name, url: r.url }))
        );
      } else {
        setUrl(data.url as string);
      }
      toast.success("Upload thành công!");
      // Reset file để có thể chọn file mới
      setFile(null);
      setFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (e) {
      setError("Có lỗi xảy ra");
      toast.error("Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect() {
    fileInputRef.current?.click();
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Đang chuyển hướng...</h1>
          <p className="text-sm text-zinc-600 mt-2">
            Vui lòng chờ trong giây lát
          </p>
        </div>
      </div>
    );
  }

  return (
    <AppSidebar>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="shrink-0 p-6 border-b bg-white">
          <h1 className="text-3xl font-bold">Upload ảnh</h1>
          <p className="text-zinc-600 mt-2">Tải lên ảnh mới vào hệ thống</p>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className="h-full w-full flex gap-6">
            {/* Upload Form */}
            <div className="flex flex-col w-1/2">
              <Card className="flex-1 flex flex-col">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-semibold">Chọn và tải lên ảnh</h2>
                </div>

                <div className="flex-1 p-6 flex flex-col justify-center">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="file" className="text-base font-medium">
                        Chọn ảnh
                      </Label>
                      <input
                        ref={fileInputRef}
                        id="file"
                        type="file"
                        accept=".png,.jpg,.jpeg,.svg"
                        multiple={isAdmin}
                        onChange={(e) => {
                          const list = Array.from(e.target.files || []);
                          if (isAdmin) {
                            setFiles(list);
                            setFile(list[0] ?? null);
                          } else {
                            const f = list[0] ?? null;
                            setFile(f);
                            setFiles(f ? [f] : []);
                          }
                        }}
                        className="hidden"
                      />
                      <div
                        onClick={handleFileSelect}
                        className="w-full h-48 border-2 border-dashed border-zinc-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 flex items-center justify-center group"
                      >
                        <div className="text-center">
                          <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-200">
                            📁
                          </div>
                          <div className="font-semibold text-lg mb-2">
                            {(() => {
                              if (isAdmin && files.length > 1)
                                return `${files.length} file đã chọn`;
                              return file
                                ? file.name
                                : "Click để chọn file ảnh";
                            })()}
                          </div>
                          <div className="text-sm text-zinc-500">
                            Chỉ PNG, JPG, SVG (Tối đa 10MB)
                          </div>
                          {(isAdmin ? files.length > 0 : !!file) && (
                            <div className="mt-3 text-sm text-green-600 font-medium">
                              ✓ File đã được chọn
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleUpload}
                      disabled={loading || !file}
                      className="w-full h-12 text-lg font-semibold"
                      size="lg"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Đang tải lên...
                        </div>
                      ) : (
                        "Tải lên"
                      )}
                    </Button>

                    {error && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 font-medium">{error}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Preview */}
            <div className="flex flex-col w-1/2">
              <Card className="flex-1 flex flex-col">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-semibold">Xem trước</h2>
                </div>

                <div className="flex-1 p-6 flex flex-col max-h-[calc(100vh-400px)]">
                  {multiResults.length > 0 ? (
                    <div className="flex-1 flex flex-col space-y-4 min-h-0">
                      <div className="flex-1 bg-zinc-50 rounded-xl overflow-auto min-h-0 p-4">
                        <div className="space-y-3">
                          {multiResults.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-3 p-3 bg-white border rounded-lg"
                            >
                              <div className="min-w-0">
                                <div className="font-medium truncate">
                                  Tên ảnh: {item.name}
                                </div>
                                <div className="text-sm text-zinc-600 truncate">
                                  URL:{" "}
                                  {typeof window !== "undefined"
                                    ? window.location.origin + item.url
                                    : item.url}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    (typeof window !== "undefined"
                                      ? window.location.origin
                                      : "") + item.url
                                  );
                                  toast.success("Đã copy URL!");
                                }}
                              >
                                Copy URL
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : url ? (
                    <div className="flex-1 flex flex-col space-y-4 min-h-0">
                      <div className="flex-1 bg-zinc-50 rounded-xl overflow-hidden min-h-0">
                        <img
                          src={url}
                          alt="uploaded"
                          className="w-full h-full object-contain"
                          style={{ maxHeight: "100%", maxWidth: "100%" }}
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">URL ảnh:</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                window.location.origin + url
                              );
                              toast.success("Đã copy URL!");
                            }}
                          >
                            Copy URL
                          </Button>
                        </div>
                        <div className="p-3 bg-zinc-50 rounded-lg text-sm font-mono break-all border">
                          {window.location.origin + url}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => window.open(url, "_blank")}
                          className="flex-1"
                        >
                          Mở trong tab mới
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setUrl("");
                            setFile(null);
                            setFiles([]);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = "";
                            }
                          }}
                          className="flex-1"
                        >
                          Upload ảnh khác
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center min-h-0">
                      <div className="text-center text-zinc-500">
                        <div className="text-8xl mb-4">🖼️</div>
                        <p className="text-lg font-medium mb-2">
                          Chưa có ảnh nào
                        </p>
                        <p className="text-sm">
                          Chọn và upload ảnh để xem trước
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppSidebar>
  );
}
