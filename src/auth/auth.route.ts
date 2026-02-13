import 'dotenv/config'
import { Request, Response, Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../database'

export const authRouter = Router()

/* CRÉATION D'UN COMPTE UTILISATEUR */
authRouter.post('/sign-up', async (req: Request, res: Response) => {
  const { username, email, password } = req.body

  /**********************************/
  /*              TEST              */
  /**********************************/
  // 1 - Inscription réussie (201)
  // const email: string = "red@example.com";
  // const password = "password123";

  // 2 - Données manquantes (400)
  // const username: string = "ash";
  // const email: string = "";
  // const password: string = "password123";

  // Vérifie si les données entrées sont correctes (400)
  if (!username || !email || !password) {
    return res.status(400).json({
      error: '[ERREUR] Information(s) manquante(s) ou invalide(s)',
    })
  }

  try {
    /* Vérifier l'unicité de l'email */
    // Recherche un user ayant le même email
    const isUser = await prisma.user.findUnique({
      where: { email },
    })

    // Vérifier si l'utilisateur existe (409)
    if (isUser) {
      return res.status(409).json({
        error: '❌User already exist',
      })
    }

    // Création de l'utilisateur avec un mot de passe hashé
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        username: username,
        email: email,
        password: hashedPassword,
      },
    })

    // Génération du token JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '7 days' }, // durée de vie du token
    )

    // Retour des informations utilisateur (201)
    return res.status(201).json({
      message: "Création d'un utilisateur réussie ✅​",
      token, // Retour du token
      user: {
        id: user.id,
        name: user.username,
        email: user.email,
      },
    })
  } catch (error) {
    // Retourne une erreur côté serveur (500)
    console.error('❗[ERROR] Connexion non établie')
    return res.status(500).json({
      error: '❗Erreur serveur',
    })
  }
})

/* CONNEXION UTILISATEUR */
authRouter.post('/sign-in', async (req: Request, res: Response) => {
  const { email, password } = req.body
  /**********************************/
  /*              TEST              */
  /**********************************/

  // 1 - Connexion réussie (200)
  // const email: string = "red@example.com";
  // const password = "password123";

  // 2 - Utilisateur inconnu / Email inconnu (401)
  // const email: string = "red@example.com";
  // const password = "password123";

  // 3 - Mot de passe incorrect (401)
  // const email: string = "red@example.com";
  // const password = "passwor123";

  // 4 - Données manquantes (400)
  // const email: string = "red@example.com";
  // const password = "password123";

  if (!email || !password) {
    return res.status(400).json({
      error: '[ERREUR] Information(s) manquante(s)',
    })
  }

  try {
    // Recherche de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
    })

    // Vérifie si un utilisateur existe
    if (!user) {
      return res.status(401).json({
        error: '[ERREUR] Utilisateur inconnu',
      })
    }

    // Vérification du mot de passe utilisateur
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return res.status(401).json({
        error: '[ERREUR] Email ou mot de passe incorrect',
      })
    }

    // Génération du token JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }, // Le token expire dans 1 heure
    )

    // Retour des informations utilisateur
    return res.status(200).json({
      message: 'Connexion réussie',
      token, // Renvoie du token
      user: {
        id: user.id,
        name: user.username,
        email: user.email,
      },
    })
  } catch (error) {
    // Erreur côté serveur
    return res.status(500).json({
      error: '[ERREUR] Erreur serveur',
    })
  }
})

