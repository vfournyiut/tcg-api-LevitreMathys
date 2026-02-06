
import { app } from '../src/index';
import bcrypt from 'bcryptjs';
import { describe } from "node:test";
import { expect, it } from "vitest";
import { prismaMock } from "./vitest.setup";
import request from 'supertest';


// Création utilisateur
describe('POST /api/auth/sign-up', () => {

    // Base global des données pour les tests
    const mockedCreateUser = {
        id: 1,
        username: "usertest",
        email: "usertest@example.com",
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date()
    }

    // Création d'un utilisateur => 201
    it('should create a new user', async () => {

        prismaMock.user.create.mockResolvedValue(mockedCreateUser);

        const response = await request(app)
            .post('/api/auth/sign-up')
            .send({ username: 'usertest', email: 'usertest@example.com', password: 'hashedPassword' })

        expect(response.status).toBe(201)
        expect(response.body).toHaveProperty('message', 'Création d\'un utilisateur réussie ✅​')
        expect(response.body.user).toHaveProperty('name', 'usertest')
        expect(response.body.user).toHaveProperty('email', 'usertest@example.com')
    })

    // Email déjà existant => 409
    it('should return 409 if email already exists', async () => {

        // Création du 1er utilisateur
        prismaMock.user.create.mockRejectedValue(new Error('Unique constraint failed'))

        // Création du 2ème utilisateur avec le même email
        prismaMock.user.findUnique.mockResolvedValue(mockedCreateUser)

        const response = await request(app)
            .post('/api/auth/sign-up')
            .send({ username: 'usertest', email: 'usertest@example.com', password: 'hashedPassword' })

        expect(response.status).toBe(409)
        expect(response.body).toHaveProperty('error', "❌User already exist")
    })


    // Données manquantes ou invalides => 400
    it('should return 400 for invalid data', async () => {

        prismaMock.user.create.mockRejectedValue(new Error('Unique constraint failed'))

        const response = await request(app)
            .post('/api/auth/sign-up')
            .send({ username: 'usertest', email: '', password: 'hashedPassword' })

        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty('error')
        expect(response.body.error).toBe('[ERREUR] Information(s) manquante(s) ou invalide(s)')
    })

    // Erreur serveur => 500
    it('should return 500 if there is a server error', async () => {

        // Simule une erreur côté serveur
        prismaMock.user.create.mockImplementation(() => {
            throw new Error('Unexpected server error');
        });

        const response = await request(app)
            .post('/api/auth/sign-up')
            .send({
                username: 'usertest',
                email: 'usertest@example.com',
                password: 'hashedPassword'
            });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toBe('❗Erreur serveur');
    });
})


// Connexion utilisateur
describe('POST /api/auth/sign-in', () => {

    const hashedPassword = bcrypt.hashSync('password123', 10);

    // Base global des données pour les tests
    const mockedUser = {
        id: 1,
        username: "usertest",
        email: "usertest@example.com",
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date()
    }

    // Connexion réussie => 200
    it('should sign in a user successfully', async () => {
        prismaMock.user.findUnique.mockResolvedValue(mockedUser);

        const response = await request(app)
            .post('/api/auth/sign-in')
            .send({ email: 'usertest@example.com', password: 'password123' });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Connexion réussie');
        expect(response.body.user).toHaveProperty('name', 'usertest');
        expect(response.body.user).toHaveProperty('email', 'usertest@example.com');
        expect(response.body).toHaveProperty('token');
    });

    // Information(s) manquante(s) => 400
    it('should return 400 for missing information', async () => {
        const response = await request(app)
            .post('/api/auth/sign-in')
            .send({ email: 'usertest@example.com', password: '' });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', '[ERREUR] Information(s) manquante(s)');
    });

    // Utilisateur inconnu / Email inconnu => 401
    it('should return 401 for unknown user', async () => {

        const response = await request(app)
            .post('/api/auth/sign-in')
            .send({ email: 'unknown@example.com', password: 'password123' });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', '[ERREUR] Utilisateur inconnu');
    })

    // Email ou mot de passe incorrect => 401
    it('should return 401 for incorrect password', async () => {
        prismaMock.user.findUnique.mockResolvedValue(mockedUser);

        const response = await request(app)
            .post('/api/auth/sign-in')
            .send({ email: 'usertest@example.com', password: 'wrongpassword' });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', '[ERREUR] Email ou mot de passe incorrect');
    });

    // Erreur serveur => 500
    it('should return 500 if there is a server error', async () => {

        // Simule une erreur côté serveur
        prismaMock.user.create.mockImplementation(() => {
            throw new Error('Unexpected server error');
        });

        const response = await request(app)
            .post('/api/auth/sign-up')
            .send({
                username: 'usertest',
                email: 'usertest@example.com',
                password: 'hashedPassword'
            });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toBe('❗Erreur serveur');
    });

})

describe