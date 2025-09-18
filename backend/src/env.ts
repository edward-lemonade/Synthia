import dotenv from 'dotenv';

dotenv.config({ path: './.env' }); 

export const PRODUCTION = process.env.PRODUCTION
export const PORT = process.env.PORT || 5000

export const MONGO_STRING = process.env.MONGO_STRING

export const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN
export const AUTH0_CLIENT = process.env.CLIENT
export const AUTH0_SECRET = process.env.AUTH0_SECRET
export const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE

export const REDIS_URL = process.env.REDIS_URL