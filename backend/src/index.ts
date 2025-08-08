import { PORT } from "./env";

import express from "express";
import cors from "cors";

import routes from "./routes";
import { connectMongo } from "./db/mongo";

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

