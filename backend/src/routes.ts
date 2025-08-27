import { Router } from "express";
import { checkJwt } from "./middleware/auth.middleware";
import { saveExisting, saveNew, getMine, load, deleteStudio, rename, saveOverwrite } from "./controllers/project.controller";

import multer from "multer";
import { loadAudioFiles, saveAudioFiles } from "./controllers/project_files.controller";
const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.post('/api/projects/get_mine', checkJwt, getMine);
//router.post('/api/projects/save_existing', checkJwt, saveExisting);
router.post('/api/projects/save_overwrite', checkJwt, saveOverwrite);
router.post('/api/projects/save_new', checkJwt, saveNew);
router.post('/api/projects/load', checkJwt, load);
router.post('/api/projects/delete_studio', checkJwt, deleteStudio);
router.post('/api/projects/rename', checkJwt, rename);

router.post('/api/project_files/save', checkJwt, upload.any(), saveAudioFiles);
router.post('/api/project_files/load', checkJwt, loadAudioFiles)

export default router;