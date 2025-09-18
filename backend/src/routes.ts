import { Router } from "express";
import multer from "multer";
import { requireAuth, optionalAuth } from "./middleware/auth.middleware";

import * as ProjectController from "./controllers/project.controller";
import * as ProjectFilesController from "./controllers/project_files.controller";
import * as TrackController from "./controllers/track.controller";
import * as UserController from "./controllers/user.controller"


const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.get('/api/me', requireAuth, UserController.getUser)
router.put('/api/me/create', requireAuth, UserController.createUser)
router.put('/api/user/profile', requireAuth, UserController.updateUserProfile)
router.put('/api/user/profile_picture', requireAuth, upload.single('profilePicture'), UserController.updateProfilePicture)
router.get('/api/profile/:displayName', optionalAuth, UserController.getProfile);

router.post('/api/projects/get_mine', requireAuth, ProjectController.getMine);
router.post('/api/projects/get_project', requireAuth, ProjectController.getProject);
router.post('/api/projects/save_overwrite', requireAuth, ProjectController.saveOverwrite);
router.post('/api/projects/save_new', requireAuth, ProjectController.saveNew);
router.post('/api/projects/get_studio', requireAuth, ProjectController.load);
router.post('/api/projects/delete_studio', requireAuth, ProjectController.deleteStudio);
router.post('/api/projects/rename', requireAuth, ProjectController.rename);
router.post('/api/projects/rename_front', requireAuth, ProjectController.renameFront);
router.post('/api/projects/get_export', requireAuth, ProjectController.getExport);
router.post('/api/projects/get_front', requireAuth, ProjectController.getFront);
router.post('/api/projects/publish', requireAuth, ProjectController.publish);
router.post('/api/projects/unpublish', requireAuth, ProjectController.unpublish);

router.post('/api/project_files/save', requireAuth, upload.any(), ProjectFilesController.saveAudioFiles);
router.post('/api/project_files/load', requireAuth, ProjectFilesController.loadAudioFiles);

router.get('/api/track/:projectId/data', optionalAuth, TrackController.data);
router.get('/api/track/:projectId/audio', optionalAuth, TrackController.audio);
router.post('/api/track/:projectId/comment', requireAuth, TrackController.leaveComment);
router.post('/api/track/:projectId/toggle_like', requireAuth, TrackController.toggleLike);
router.post('/api/track/:projectId/record_play', requireAuth, TrackController.recordPlay);
router.post('/api/tracks/newest', optionalAuth, TrackController.newest);
router.post('/api/tracks/hottest', optionalAuth, TrackController.hottest);
router.post('/api/tracks/search', optionalAuth, TrackController.search);

export default router;