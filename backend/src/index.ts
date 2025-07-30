import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import multer from "multer"
import dotenv from 'dotenv';
import { expressjwt as jwt } from "express-jwt";
import jwksRsa from "jwks-rsa";
import { v4 as uuidv4 } from 'uuid';

// Add this to extend Express Request with 'auth'
declare global {
	namespace Express {
		interface Request {
		auth?: any;
		}
	}
}

import { connectMongo } from "./db/mongo";
import { newStudioSession } from "./db/studio_session";

dotenv.config({ path: './.env' }); 

const app = express();
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

connectMongo()

const upload = multer({ dest: "uploads/", storage: multer.memoryStorage() });

// Auth0 JWT middleware
console.log('AUTH0_DOMAIN:', process.env.AUTH0_DOMAIN);
const checkJwt = jwt({
	secret: jwksRsa.expressJwtSecret({
		cache: true,
		rateLimit: true,
		jwksRequestsPerMinute: 5,
		jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
	}),
	audience: `${process.env.AUTH0_AUDIENCE}`,
	issuer: `https://${process.env.AUTH0_DOMAIN}/`,
	algorithms: ["RS256"]
});

app.post('/api/my-projects', async (req, res) => {
	const { user } = req.body;
	res.json({});
});

// Example protected route
app.post("/api/studio_session/create", checkJwt, async (req, res) => {
	const userId = req.auth.sub; // Auth0 user ID
  	const sessionId = uuidv4();

	newStudioSession(userId, sessionId);
	
	res.json({ sessionId });
});

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
})