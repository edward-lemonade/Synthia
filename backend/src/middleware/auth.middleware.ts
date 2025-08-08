import { AUTH0_DOMAIN, AUTH0_AUDIENCE } from "../env";

import { expressjwt as jwt } from "express-jwt";
import jwksRsa from "jwks-rsa";

declare global {
	namespace Express {
		interface Request {
			auth?: any;
		}
	}
}

export const checkJwt = jwt({
	secret: jwksRsa.expressJwtSecret({
		cache: true,
		rateLimit: true,
		jwksRequestsPerMinute: 5,
		jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`
	}),
	audience: `${AUTH0_AUDIENCE}`,
	issuer: `https://${AUTH0_DOMAIN}/`,
	algorithms: ["RS256"]
});