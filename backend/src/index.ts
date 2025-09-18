import { PORT } from "./env";

// Initialize isomorphic-web-audio-api for Node.js
import 'isomorphic-web-audio-api';

import express from "express";
import cors from "cors";

import routes from "./routes";
import { connectMongo } from "./db/mongo_client";

import {enablePatches} from "immer"
enablePatches()

const app = express();

app.use(cors())
app.use(express.json())
app.use(routes);

connectMongo()

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
})
