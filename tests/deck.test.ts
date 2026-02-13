
import { app } from '../src/index';
import { describe } from "node:test";
import { expect, it } from "vitest";
import { prismaMock } from "./vitest.setup";
import request from 'supertest';
import { PokemonType } from '../src/generated/prisma/enums';


// Création utilisateur
describe('POST /api/decks', () => {
    // Création d'un deck => 201
    it('should create a new deck', async () => {

        const newDeck = {
            name: "My First Deck",
            cards: [1, 2, 3]
        }

        const mockedDeck = {
            id: 1,
            name: "My First Deck",
            userId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            cards: [
                {
                    id: 1,
                    deckId: 1,
                    cardId: 1,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    cards: {
                        id: 1,
                        name: "Bulbasaur",
                        hp: 45,
                        attack: 49,
                        type: PokemonType.Grass,
                        pokedexNumber: 1,
                        imgUrl: "https://example.com/bulbasaur.png",
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                },
                {
                    id: 2,
                    deckId: 1,
                    cardId: 2,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    cards: {
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
                },
                {
                    id: 3,
                    deckId: 1,
                    cardId: 3,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    cards: {
                        id: 3,
                        name: "Venusaur",
                        hp: 80,
                        attack: 82,
                        type: PokemonType.Grass,
                        pokedexNumber: 3,
                        imgUrl: "https://example.com/venusaur.png",
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                }
            ]
        }

        prismaMock.deck.create.mockResolvedValue(mockedDeck)

        const response = await request(app)
            .post('/api/decks')
            .send(newDeck)

        expect(response.status).toBe(200)
        expect(response.body).toHaveProperty('deck')
        expect(response.body.deck).toHaveProperty('name', 'My First Deck')
        expect(response.body.deck.cards).toHaveLength(3)
        expect(response.body.deck.cards[0].cards).toHaveProperty('name', 'Bulbasaur')
        expect(response.body.deck.cards[1].cards).toHaveProperty('name', 'Ivysaur')
        expect(response.body.deck.cards[2].cards).toHaveProperty('name', 'Venusaur')
    })

    // Erreur de 

    // Erreur côté serveur => 500
    it('should return 500 if there is a server error', async () => {

        const newDeck = {
            name: "My First Deck",
            cards: [1, 2, 3]
        }

        prismaMock.deck.create.mockRejectedValue(new Error('Database error'))

        const response = await request(app)
            .post('/api/decks')
            .send(newDeck)

        expect(response.status).toBe(500)
        expect(response.body).toHaveProperty('error', "[ERREUR] Erreur serveur:Error: Database error")
    })
})
