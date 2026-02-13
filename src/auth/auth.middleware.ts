import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number
        email: string
      }
    }
  }
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Extraction du token depuis le header Authorization
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  // Erreur si token manquant (401)
  if (!token) {
    return res.status(401).json({ error: 'Token manquant' })
  }

  try {
    // Vérification et décodage du token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: number
      email: string
    }

    // 3. Ajouter userId à la requête pour l'utiliser dans les routes
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    }

    // 4. Passer au prochain middleware ou à la route
    return next()
  } catch (error) {
    // Erreur si token invalide ou expiré
    return res.status(401).json({ error: `Token invalide ou expiré: ${error}` })
  }
}
