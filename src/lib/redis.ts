import { createClient } from 'redis';
import { hashPassword, User } from '@/lib/auth';

// Thử kết nối không password trước
let redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://159.65.128.97:6379'
});

redisClient.on('error', async (err) => {
    console.error('Redis Client Error:', err);

    // Nếu lỗi authentication, thử lại với password
    if (err.message.includes('AUTH') || err.message.includes('password')) {
        console.log('Retrying with password...');
        await redisClient.disconnect();

        redisClient = createClient({
            url: process.env.REDIS_URL || 'redis://159.65.128.97:6379',
            password: process.env.REDIS_PASSWORD || 'Kietdeptrai123'
        });

        redisClient.on('error', (err2) => {
            console.error('Redis Client Error (with password):', err2);
        });

        redisClient.on('connect', () => {
            console.log('Connected to Redis (with password)');
        });

        if (!redisClient.isOpen) {
            redisClient.connect();
        }
    }
});

redisClient.on('connect', () => {
    console.log('Connected to Redis (no password)');
});

// Connect to Redis
if (!redisClient.isOpen) {
    redisClient.connect();
}

export default redisClient;

// Seed default admin if missing: email "mana@gmail.com", password "123456"
let seededDefaultAdmin = false;
async function seedAdminIfNeeded() {
    if (seededDefaultAdmin) return;
    try {
        if (!redisClient.isOpen) return;
        const email = 'mana@gmail.com';
        // Kiểm tra trong user_list
        const list = await redisClient.lRange('user_list', 0, -1);
        const has = list.find((s) => { try { const u = JSON.parse(s); return u.email === email; } catch { return false; } });
        if (has) { seededDefaultAdmin = true; return; }

        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const passwordHash = await hashPassword('123456');
        const user: User = {
            id: userId,
            email,
            password: passwordHash,
            role: 'admin',
            createdAt: new Date().toISOString(),
            storageMb: 1024,
        } as any;

        try { await redisClient.lPush('user_list', JSON.stringify(user)); } catch { }

        seededDefaultAdmin = true;
        console.log('Seeded default admin: mana@gmail.com');
    } catch (e) {
        console.error('Seed admin failed:', e);
    }
}

// Attempt seeding after connect events
redisClient.on('connect', () => { seedAdminIfNeeded(); cleanupLegacyKeys(); });
setTimeout(() => { seedAdminIfNeeded(); cleanupLegacyKeys(); }, 1000);

// Cleanup legacy keys: keep only user_list, images:* (list per email), token if any
let cleanedUp = false;
async function cleanupLegacyKeys() {
    if (cleanedUp) return;
    try {
        if (!redisClient.isOpen) return;
        // 1) Old user list key
        try { await redisClient.del('userlist'); } catch { }
        // 2) Old images object key
        try { await redisClient.del('images'); } catch { }
        // 3) Old per-email id list keys
        try {
            const oldUserImagesKeys = await redisClient.keys('user_images:*');
            for (const k of oldUserImagesKeys) { try { await redisClient.del(k); } catch { } }
        } catch { }
        // 4) Very old images per userId:id format
        try {
            const legacyImageKeys = await redisClient.keys('images:*:*');
            for (const k of legacyImageKeys) { try { await redisClient.del(k); } catch { } }
        } catch { }
        cleanedUp = true;
        console.log('Redis cleanup done: removed legacy keys');
    } catch (e) {
        console.error('Redis cleanup failed:', e);
    }
}
