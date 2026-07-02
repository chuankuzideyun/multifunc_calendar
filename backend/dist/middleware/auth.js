"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const prisma_1 = require("../config/prisma");
async function requireAuth(req, res, next) {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ error: 'Authentication required. Please login.' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true }
        });
        if (!user) {
            return res.status(401).json({ error: 'User not found.' });
        }
        req.user = {
            id: user.id,
            email: user.email
        };
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Invalid or expired session. Please login again.' });
    }
}
exports.requireAuth = requireAuth;
