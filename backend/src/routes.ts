import { Router } from "express";
import multer from "multer";
import { checkJwt } from "./middleware/auth.middleware";

import * as ProjectController from "./controllers/project.controller";
import * as ProjectFilesController from "./controllers/project_files.controller";
import * as TrackController from "./controllers/track.controller";
import * as UserController from "./controllers/user.controller"


const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.get('/api/me', checkJwt, UserController.getOrCreateUser)

router.post('/api/projects/get_mine', checkJwt, ProjectController.getMine);
router.post('/api/projects/get_project', checkJwt, ProjectController.getProject);
router.post('/api/projects/save_overwrite', checkJwt, ProjectController.saveOverwrite);
router.post('/api/projects/save_new', checkJwt, ProjectController.saveNew);
router.post('/api/projects/get_studio', checkJwt, ProjectController.load);
router.post('/api/projects/delete_studio', checkJwt, ProjectController.deleteStudio);
router.post('/api/projects/rename', checkJwt, ProjectController.rename);
router.post('/api/projects/get_export', checkJwt, ProjectController.getExport)
router.post('/api/projects/publish', checkJwt, ProjectController.publish)

router.post('/api/project_files/save', checkJwt, upload.any(), ProjectFilesController.saveAudioFiles);
router.post('/api/project_files/load', checkJwt, ProjectFilesController.loadAudioFiles);

router.get('/api/track/:projectId/data', checkJwt, TrackController.data);
router.get('/api/track/:projectId/audio', checkJwt, TrackController.audio);
router.post('/api/track/:projectId/comment', checkJwt, TrackController.leaveComment);
router.post('/api/track/:projectId/toggle_like', checkJwt, TrackController.toggleLike);
router.post('/api/track/:projectId/record_play', checkJwt, TrackController.recordPlay);

export default router;