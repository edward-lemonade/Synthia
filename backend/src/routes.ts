import { Router } from "express";
import { checkJwt } from "./middleware/auth.middleware";
import { createSession, saveExisting, saveNew, getMine, load, delete_studio, rename } from "./controllers/project.controller";

const router = Router();
router.post('/api/studio/create_session', checkJwt, createSession);
router.post('/api/projects/save_existing', checkJwt, saveExisting);
router.post('/api/projects/save_new', checkJwt, saveNew);
router.post('/api/projects/get_mine', checkJwt, getMine);
router.post('/api/projects/load', checkJwt, load);
router.post('/api/projects/delete_studio', checkJwt, delete_studio);
router.post('/api/projects/rename', checkJwt, rename);

export default router;