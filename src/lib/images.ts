import { verifyToken } from "@/lib/auth";

export interface ImageMetadata {
    id: string;
    userId: string;
    originalName: string;
    fileName: string;
    url: string;
    size: number;
    type: string;
    uploadedAt: string;
}

export { verifyToken };
