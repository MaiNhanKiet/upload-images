export default function NotFound() {
    return (
        <main className="flex min-h-[60vh] items-center justify-center p-6 text-center">
            <div>
                <h1 className="text-3xl font-semibold">Không tìm thấy trang (404)</h1>
                <p className="text-muted-foreground mt-2">
                    Trang bạn yêu cầu không tồn tại hoặc đã bị di chuyển.
                </p>
            </div>
        </main>
    );
}