import { Router } from "express";
import { checkJwt } from "./middleware/auth.middleware";
import { createSession, saveExistingProject, saveNewProject } from "./controllers/studio.controller";

const router = Router();
router.post('/api/studio/create_session', checkJwt, createSession);
router.post('/api/projects/save_existing', checkJwt, saveExistingProject);
router.post('/api/projects/save_new', checkJwt, saveNewProject);
//router.post('/projects/my-projects', checkJwt, myProject);

export default router;