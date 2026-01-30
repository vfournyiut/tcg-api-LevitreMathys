import { Request, Response, Router } from 'express'
import { prisma } from '../database'

export const cardRouter = Router()

cardRouter.get("/cards", async (req: Request, res: Response) => {

    try {
        const cards = await prisma.card.findMany()

        cards.sort((a, b) => a.pokedexNumber - b.pokedexNumber)

        console.log(cards)
        return res.status(200).json({
            cards
        })
    } catch (error) {
        return res.status(500).json({
            error: "[ERREUR] Erreur côté serveur"
        })
    }

})