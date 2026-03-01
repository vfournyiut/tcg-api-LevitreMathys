import jwt from 'jsonwebtoken';
import { app } from '../src/index';
import { describe, beforeAll, beforeEach, it, expect } from 'vitest';
import { prismaMock } from './vitest.setup';
import request from 'supertest';
import { PokemonType } from '../src/generated/prisma/enums';
import { Deck, DeckCard, Card } from '../src/generated/prisma/client';

let token: string;

beforeAll(() => {
    token = jwt.sign(
        { userId: 1, email: 'red@example.com' },
        process.env.JWT_SECRET as string,
        { expiresIn: '1h' }
    );
});

beforeEach(() => {
    prismaMock.card.findMany.mockReset();
    prismaMock.deck.create.mockReset();
    prismaMock.deck.findMany.mockReset();
    prismaMock.deck.findUnique.mockReset();
    prismaMock.deck.update.mockReset();
    prismaMock.deck.delete.mockReset();
    prismaMock.deckCard.deleteMany.mockReset();
});

describe('POST /api/decks', () => {
    it('creates a new deck (201)', async () => {
        const newDeck = { name: 'My First Deck', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] };

        prismaMock.card.findMany.mockResolvedValue(newDeck.cards.map(id => ({ id })));

        const mockedDeck = {
            id: 1,
            name: newDeck.name,
            userId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            cards: newDeck.cards.map(id => ({
                id,
                deckId: 1,
                cardId: id,
                createdAt: new Date(),
                updatedAt: new Date(),
                cards: {
                    id,
                    name: ['Bulbasaur', 'Ivysaur', 'Venusaur', 'Charmander', 'Squirtle', 'Pikachu', 'Jigglypuff', 'Meowth', 'Psyduck', 'Snorlax'][id - 1],
                    hp: 50 + id * 5,
                    attack: 50 + id * 4,
                    type: PokemonType.Grass,
                    pokedexNumber: id,
                    imgUrl: 'https://example.com/pokemon.png',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            }))
        };

        prismaMock.deck.create.mockResolvedValue(mockedDeck as Deck);

        const res = await request(app)
            .post('/api/decks')
            .set('Authorization', `Bearer ${token}`)
            .send(newDeck);

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('deck');
        expect(res.body.deck).toHaveProperty('name', newDeck.name);
        expect(res.body.deck.cards).toHaveLength(10);
    });

    it('returns 400 when cards is not an array', async () => {
        const res = await request(app)
            .post('/api/decks')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Bad', cards: 'not-an-array' });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error', 'La liste de cartes est invalide');
    });

    it('returns 400 when name missing or cards length !== 10', async () => {
        const res = await request(app)
            .post('/api/decks')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: '', cards: [1, 2, 3] });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error', 'Informations manquantes ou invalides');
    });

    it('returns 400 when some cards do not exist', async () => {
        const newDeck = { name: 'Deck', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] };
        prismaMock.card.findMany.mockResolvedValue(newDeck.cards.slice(0, 9).map(id => ({ id })));

        const res = await request(app)
            .post('/api/decks')
            .set('Authorization', `Bearer ${token}`)
            .send(newDeck);

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error', 'Une ou plusieurs cartes sont invalides ou inexistantes');
    });

    it('returns 401 when unauthenticated', async () => {
        const res = await request(app)
            .post('/api/decks')
            .send({ name: 'Deck', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });

        expect(res.status).toBe(401);
    });

    it('returns 500 on server error', async () => {
        const newDeck = { name: 'Deck', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] };
        prismaMock.card.findMany.mockResolvedValue(newDeck.cards.map(id => ({ id })));
        prismaMock.deck.create.mockImplementation(() => { throw new Error('DB failure'); });

        const res = await request(app)
            .post('/api/decks')
            .set('Authorization', `Bearer ${token}`)
            .send(newDeck);

        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty('error');
    });
});

describe('GET /api/decks/mine', () => {
    it('returns user decks (200)', async () => {
        const mockedDecks = [
            { id: 1, name: 'D1', userId: 1, createdAt: new Date(), updatedAt: new Date(), cards: [] }
        ];

        prismaMock.deck.findMany.mockResolvedValue(mockedDecks as Deck[]);

        const res = await request(app)
            .get('/api/decks/mine')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('deck');
    });

    it('returns 500 on server error', async () => {
        prismaMock.deck.findMany.mockImplementation(() => { throw new Error('DB'); });

        const res = await request(app)
            .get('/api/decks/mine')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty('error');
    });
});

describe('GET /api/decks/:id', () => {
    it('returns deck when exists and owned (200)', async () => {
        const deck = { id: 1, name: 'D1', userId: 1, cards: [], createdAt: new Date(), updatedAt: new Date() };
        prismaMock.deck.findUnique.mockResolvedValue(deck as Deck);

        const res = await request(app)
            .get('/api/decks/1')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('deck');
    });

    it('returns 404 if not found', async () => {
        prismaMock.deck.findUnique.mockResolvedValue(null);

        const res = await request(app)
            .get('/api/decks/999')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error', '[ERREUR] Deck introuvable');
    });

    it('returns 403 if not owner', async () => {
        const deck = { id: 2, name: 'D2', userId: 2, cards: [], createdAt: new Date(), updatedAt: new Date() };
        prismaMock.deck.findUnique.mockResolvedValue(deck as Deck);

        const res = await request(app)
            .get('/api/decks/2')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty('error', '[ERREUR] Accès interdit à ce deck');
    });

    it('returns 500 on server error', async () => {
        prismaMock.deck.findUnique.mockImplementation(() => { throw new Error('DB') })

        const res = await request(app)
            .get('/api/decks/1')
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(500)
        expect(res.body).toHaveProperty('error')
    })
});

describe('PATCH /api/decks/:id', () => {
    it('updates deck and returns 200', async () => {
        const deck = { id: 1, name: 'Old', userId: 1, createdAt: new Date(), updatedAt: new Date() }
        prismaMock.deck.findUnique.mockResolvedValue(deck as Deck)
        prismaMock.card.findMany.mockResolvedValue([1,2,3,4,5,6,7,8,9,10].map(id => ({ id })) as Card[])
        prismaMock.deckCard.deleteMany.mockResolvedValue({ count: 0 })
        const updated = { id: 1, name: 'Old', userId: 1, cards: [], createdAt: new Date(), updatedAt: new Date() }
        prismaMock.deck.update.mockResolvedValue(updated as Deck)

        const res = await request(app)
        .patch('/api/decks/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ cards: [1,2,3,4,5,6,7,8,9,10] })  

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('name', 'Old')
    });

    it('returns 404 if deck not found', async () => {
        prismaMock.deck.findUnique.mockResolvedValue(null);

        const res = await request(app)
            .patch('/api/decks/999')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'New', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error', '[ERREUR] Deck introuvable');
    });

    it('returns 403 if not owner', async () => {
        prismaMock.deck.findUnique.mockResolvedValue({ id: 2, name: 'Deck', userId: 2, createdAt: new Date(), updatedAt: new Date(), cards: [] } as Deck);

        const res = await request(app)
            .patch('/api/decks/2')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'New', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });

        expect(res.status).toBe(403);
    });

    it('returns 400 if cards invalid', async () => {
        prismaMock.deck.findUnique.mockResolvedValue({ id: 1, userId: 1 } as any)
        prismaMock.card.findMany.mockResolvedValue([1, 2, 3].map(id => ({ id })) as Card[])

        const res = await request(app)
            .patch('/api/decks/1')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Deck', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })

        expect(res.status).toBe(400)
        expect(res.body).toHaveProperty('error', 'Une ou plusieurs cartes sont invalides ou inexistantes')
    });

    it('returns 400 if cards array wrong length', async () => {
        prismaMock.deck.findUnique.mockResolvedValue({ id: 1, userId: 1 } as any)

        const res = await request(app)
            .patch('/api/decks/1')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Deck', cards: [1, 2, 3] })  // array mais seulement 3 cartes

        expect(res.status).toBe(400)
        expect(res.body).toHaveProperty('error', 'Le deck doit contenir exactement 10 cartes')
    })

    it('returns 500 on server error', async () => {
        prismaMock.deck.findUnique.mockImplementation(() => { throw new Error('DB') })

        const res = await request(app)
            .patch('/api/decks/1')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'New', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })

        expect(res.status).toBe(500)
        expect(res.body).toHaveProperty('error', '[ERREUR] Erreur serveur')
    })

});

describe('DELETE /api/decks/:id', () => {
    it('deletes deck and returns 200', async () => {
        prismaMock.deck.findUnique.mockResolvedValue({ id: 1, name: 'Deck', userId: 1, createdAt: new Date(), updatedAt: new Date(), cards: [] } as Deck);
        prismaMock.deckCard.deleteMany.mockResolvedValue({ count: 0 });
        prismaMock.deck.delete.mockResolvedValue({ id: 1, name: 'Deck', userId: 1, createdAt: new Date(), updatedAt: new Date(), cards: [] } as Deck);

        const res = await request(app)
            .delete('/api/decks/1')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', 'Deck supprimé avec succès');
    });

    it('returns 404 if deck not found', async () => {
        prismaMock.deck.findUnique.mockResolvedValue(null);

        const res = await request(app)
            .delete('/api/decks/999')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
    });

    it('returns 403 if not owner', async () => {
        prismaMock.deck.findUnique.mockResolvedValue({ id: 2, name: 'Deck', userId: 2, createdAt: new Date(), updatedAt: new Date(), cards: [] } as Deck);

        const res = await request(app)
            .delete('/api/decks/2')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
    });
    it('returns 500 on server error', async () => {
        prismaMock.deck.findUnique.mockImplementation(() => { throw new Error('DB') })

        const res = await request(app)
            .delete('/api/decks/1')
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(500)
        expect(res.body).toHaveProperty('error', '[ERREUR] Erreur serveur')
    })
});
