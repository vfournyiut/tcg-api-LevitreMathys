import 'dotenv/config';
import jwt from 'jsonwebtoken';
import bcrypt from "bcryptjs";
import { createServer } from "http";
import { env } from "./env";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { prisma } from './database';

// Create Express app
export const app = express();

// Middlewares
app.use(
    cors({
        origin: true,  // Autorise toutes les origines
        credentials: true,
    }),
);

app.use(express.json());

// Serve static files (Socket.io test client)
app.use(express.static('public'));

// Health check endpoint
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", message: "TCG Backend Server is running" });
});


/* CRÉATION D'UN COMPTE UTILISATEUR */
app.post("/api/auth/sign-up", async (_req, res) => {

    const { username, email, password } = _req.body;

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
        res.status(400).json({
            error: "[ERREUR] Information(s) manquante(s) ou invalide(s)",
        });
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
                error: "❌User already exist"
            });
        }

        // Création de l'utilisateur avec un mot de passe hashé
        const hashedPassword = await bcrypt.hash(password, 10);
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
        console.error('❗[ERROR] Connexion non établie');
        return res.status(500).json({
            error: "❗Erreur serveur"
        });
    }
})

/* CONNEXION UTILISATEUR */
app.post("/api/auth/sign-in", async (_req, res) => {

    const { email, password } = _req.body;
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
        res.status(400).json({
            error: "[ERREUR] Information(s) manquante(s)",
        });
    }

    try {

        // Recherche de l'utilisateur
        const user = await prisma.user.findUnique({
            where: { email }
        });

        // Vérifie si un utilisateur existe
        if (!user) {
            return res.status(401).json({
                error: "[ERREUR] Utilisateur inconnu"
            })
        }

        // Vérification du mot de passe utilisateur
        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return res.status(401).json({
                error: "[ERREUR] Email ou mot de passe incorrect"
            });
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
            error: "[ERREUR] Erreur serveur"
        });
    }
})


declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: number;
                email: string;
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
            email: decoded.email
        }

        // 4. Passer au prochain middleware ou à la route
        return next()
    } catch (error) {
        // Erreur si token invalide ou expiré
        return res.status(401).json({ error: 'Token invalide ou expiré' })
    }
}

// Start server only if this file is run directly (not imported for tests)
if (require.main === module) {
    // Create HTTP server
    const httpServer = createServer(app);


    // Start server
    try {
        httpServer.listen(env.PORT, () => {
            console.log(`\n🚀 Server is running on http://localhost:${env.PORT}`);
            console.log(`🧪 Socket.io Test Client available at http://localhost:${env.PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}
