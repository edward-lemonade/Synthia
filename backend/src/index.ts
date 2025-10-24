import { PORT, FRONTEND_URL } from "./env";

// Initialize isomorphic-web-audio-api for Node.js
import 'isomorphic-web-audio-api';

import express from "express";
import cors from "cors";

import routes from "./routes";
import { connectMongo } from "./db/mongo_client";

import {enablePatches} from "immer"
enablePatches()

const app = express();

app.use(cors(
	{
		origin: `${FRONTEND_URL}`,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: [
			'Content-Type',
			'Authorization', 
			"Origin", 
			"Accept"
		],
		credentials: true,
		optionsSuccessStatus: 200,
	}
))
app.options("/{*any}", cors())

app.use(express.json())
app.use(routes);

connectMongo()

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
})
