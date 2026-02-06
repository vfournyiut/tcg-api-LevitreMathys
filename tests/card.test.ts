
import { app } from '../src/index';
import { describe } from "node:test";
import { expect, it } from "vitest";
import { prismaMock } from "./vitest.setup";
import request from 'supertest';
import { PokemonType } from '../src/generated/prisma/enums';
import { Card } from '../src/generated/prisma/client';


// Création utilisateur
describe('GET /api/cards', () => {

    // Récupération de toutes les cartes => 200
    it('should return all cards', async () => {

        const mockedCards: Card[] = [
            {
                id: 1,
                name: "Bulbasaur",
                hp: 45,
                attack: 49,
                type: PokemonType.Grass,
                pokedexNumber: 1,
                imgUrl: "https://example.com/bulbasaur.png",
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: 2,
                name: "Ivysaur",
                hp: 60,
                attack: 62,
                type: PokemonType.Grass,
                pokedexNumber: 2,
                imgUrl: "https://example.com/ivysaur.png",
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ]

        prismaMock.card.findMany.mockResolvedValue(mockedCards);

        const response = await request(app)
            .get('/api/cards')

        expect(response.status).toBe(200)
        expect(response.body).toHaveProperty('cards')
        expect(response.body.cards).toHaveLength(2)
        expect(response.body.cards[0]).toHaveProperty('name', 'Bulbasaur')
        expect(response.body.cards[1]).toHaveProperty('name', 'Ivysaur')
    })

    // Erreur côté serveur => 500
    it('should return 500 if there is a server error', async () => {

        prismaMock.card.findMany.mockRejectedValue(new Error('Database error'))

        const response = await request(app)
            .get('/api/cards')

        expect(response.status).toBe(500)
        expect(response.body).toHaveProperty('error', "[ERREUR] Erreur côté serveur")
    })
})
