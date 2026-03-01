import express, { Request, Response } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { describe, it, beforeAll, expect } from 'vitest';
import { authenticateToken } from '../src/auth/auth.middleware';

const app = express();

// Route de test qui utilise le middleware
app.get('/test-auth', authenticateToken, (req: Request, res: Response) => {
    res.status(200).json({ userId: req.user!.userId, email: req.user!.email });
});

let validToken: string;
let invalidToken: string;

beforeAll(() => {

    process.env.JWT_SECRET = 'test-secret';
    validToken = jwt.sign(
        { userId: 123, email: "test@example.com" },
        'test-secret',
        { expiresIn: '1h' }
    );

    invalidToken = "this.is.an.invalid.token";
});

describe('authenticateToken middleware', () => {

    it('should pass and attach user if token is valid', async () => {
        const response = await request(app)
            .get('/test-auth')
            .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('userId', 123);
        expect(response.body).toHaveProperty('email', 'test@example.com');
    });

    it('should return 401 if token is missing', async () => {
        const response = await request(app)
            .get('/test-auth'); // pas de header Authorization

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Token manquant');
    });

    it('should return 401 if token is invalid', async () => {
        const response = await request(app)
            .get('/test-auth')
            .set('Authorization', `Bearer ${invalidToken}`);

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Token invalide ou expiré');
    });

    it('should return 401 if Authorization header is malformed', async () => {
        const response = await request(app)
            .get('/test-auth')
            .set('Authorization', `${validToken}`); // pas de "Bearer"

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Token manquant');
    });

});
