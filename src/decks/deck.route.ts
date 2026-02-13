
import { Request, Response, Router } from "express";
import { authenticateToken } from "../auth/auth.middleware";
import { prisma } from "../database";

export const deckRouter = Router();

deckRouter.post("/", authenticateToken, async (req: Request, res: Response) => {
    const { name, cards } = req.body;


    if (!Array.isArray(cards)) {
        return res.status(400).json({
            error: "La liste de cartes est invalide"
        });
    }


    // Vérification de l'existance 
    if (!name || typeof name != "string" || cards.length != 10) {
        return res.status(400).json({
            error: "Informations manquantes ou invalides",
        });
    }

    // Existance des cartes
    const existingCards = await prisma.card.findMany({
        where: {
            id: { in: cards }
        },
        select: { id: true }
    })

    if (existingCards.length !== 10) {
        return res.status(400).json({
            error: "Une ou plusieurs cartes sont invalides ou inexistantes"
        });
    }

    try {
        // verification de l'existance de l'utilisateur (pour éviter une erreur TypeScript)
        if (!req.user) {
            return res.status(401).json({
                error: "Utilisateur non authentifié."
            })
        }

        const deck = await prisma.deck.create({
            data: {
                name: `${name}`,
                userId: req.user.userId, // association avec l'utilisateur connecté
                cards: {
                    create: cards.map((cardId: number) => ({
                        cardId
                    }))
                }
            }
        })

        return res.status(201).json({
            message: `Deck '${name}' créé avec succès !`,
            deck
        })

    } catch (error) {
        // Retourne une erreur côté serveur (500)
        console.error('❗[ERROR] Connexion non établie');
        return res.status(500).json({
            error: "[ERREUR] Erreur serveur:" + error
        });
    };
})


deckRouter.get("/mine", authenticateToken, async (req: Request, res: Response) => {

    try {
        const deck = await prisma.deck.findMany({
            where: { userId: req.user!.userId },
            include: {
                cards: {
                    include: {
                        cards: true
                    }
                }
            }
        })

        return res.status(200).json({
            deck
        })
    } catch (error) {
        return res.status(500).json({
            error: "[ERREUR] Erreur serveur:" + error
        })
    }
})


deckRouter.get('/:id', authenticateToken, async (req: Request, res: Response) => {
    const { id } = req.params

    try {

        const deck = await prisma.deck.findUnique({
            where: {
                id: Number(id)
            },
            include: {
                cards: {
                    include: {
                        cards: true
                    }
                }
            }
        })

        if (!deck) {
            return res.status(404).json({
                error: "[ERREUR] Deck introuvable"
            })
        }

        if (deck.userId != req.user!.userId) {
            return res.status(403).json({
                error: "[ERREUR] Accès interdit à ce deck"
            })
        }

        return res.status(200).json({
            deck
        })
    } catch (error) {
        return res.status(500).json({
            error: "[ERREUR] Erreur serveur:" + error
        })
    }
})



deckRouter.patch("/:id", authenticateToken, async (req: Request, res: Response) => {

    const deckId = Number(req.params.id)
    const { name, cards } = req.body

    try {

        // Chercher le deck
        const deck = await prisma.deck.findUnique({
            where: {
                id: deckId
            }
        })

        // Vérifier si il existe
        if (!deck) {
            return res.status(404).json({
                error: "[ERREUR] Deck introuvable"
            })
        }

        // Vérification utilisateur
        if (deck.userId !== req.user!.userId) {
            return res.status(403).json({ error: "Accès interdit à ce deck" });
        }


        // Vérification de la bonne existence des données
        if (!Array.isArray(cards) || cards.length !== 10) {
            return res.status(400).json({
                error: "Le deck doit contenir exactement 10 cartes"
            });
        }

        const existingCards = await prisma.card.findMany({
            where: { id: { in: cards } },
            select: { id: true }
        });

        if (existingCards.length !== 10) {
            return res.status(400).json({
                error: "Une ou plusieurs cartes sont invalides ou inexistantes"
            });
        }

        if (cards !== undefined) {
            if (!Array.isArray(cards) || cards.length !== 10) {
                return res.status(400).json({
                    error: "Le deck doit contenir exactement 10 cartes"
                });
            }

            const existingCards = await prisma.card.findMany({
                where: { id: { in: cards } },
                select: { id: true }
            });

            if (existingCards.length !== 10) {
                return res.status(400).json({
                    error: "Une ou plusieurs cartes sont invalides"
                });
            }

            // Supprimer les anciennes cartes
            await prisma.deckCard.deleteMany({
                where: { deckId }
            });
        }

        // Mise à jour du deck
        const updatedDeck = await prisma.deck.update({
            where: { id: deckId },
            data: {
                name: name ?? deck.name,
                cards: cards
                    ? {
                        create: cards.map((cardId: number) => ({ cardId }))
                    }
                    : undefined
            },
            include: {
                cards: {
                    include: {
                        cards: true
                    }
                }
            }
        });

        return res.status(200).json(updatedDeck);

    } catch (error) {
        return res.status(500).json({
            error: "[ERREUR] Erreur serveur:" + error
        })
    }
})

deckRouter.delete('/:id', authenticateToken, async (req: Request, res: Response) => {

    const deckId = Number(req.params.id)

    try {
        const deck = await prisma.deck.findUnique({
            where: { id: deckId }
        })

        // Vérifier si il existe
        if (!deck) {
            return res.status(404).json({
                error: "[ERREUR] Deck introuvable"
            })
        }

        // Vérification utilisateur
        if (deck.userId !== req.user!.userId) {
            return res.status(403).json({ error: "Accès interdit à ce deck" });
        }

        await prisma.deckCard.deleteMany({
            where: { deckId }
        })

        await prisma.deck.delete({
            where: { id: deckId }
        })


        return res.status(200).json({
            message: "Deck supprimé avec succès"
        })


    } catch (error) {
        return res.status(500).json({
            error: "[ERREUR] Erreur serveur:" + error
        })
    }

})
