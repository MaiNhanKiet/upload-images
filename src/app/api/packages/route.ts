import { NextResponse } from "next/server";
import redisClient from "@/lib/redis";

const DEFAULT_PACKAGES = [
    { name: "Gói Cơ bản", bytes: 1 * 1024 * 1024 * 1024 }, // 1 GB
    { name: "Gói Nâng cao", bytes: 5 * 1024 * 1024 * 1024 }, // 5 GB
    { name: "Gói Pro", bytes: 20 * 1024 * 1024 * 1024 }, // 20 GB
];

export async function GET() {
    try {
        const raw = await redisClient.get("packages:storage");
        const packages = raw ? JSON.parse(raw) : DEFAULT_PACKAGES;
        return NextResponse.json({ packages });
    } catch (error) {
        return NextResponse.json({ packages: DEFAULT_PACKAGES });
    }
}


