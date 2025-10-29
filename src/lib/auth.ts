import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export type UserRole = 'admin' | 'user';

export interface User {
    id: string;
    email: string;
    password: string;
    role: UserRole;
    createdAt: string;
    storageMb?: number;
}

export interface AuthToken {
    userId: string;
    email: string;
    role: UserRole;
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export function generateToken(user: AuthToken): string {
    return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthToken | null {
    try {
        return jwt.verify(token, JWT_SECRET) as AuthToken;
    } catch {
        return null;
    }
}
