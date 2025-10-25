import { Router } from "express";
import multer from "multer";
import { requireAuth, optionalAuth } from "./middleware/auth.middleware";

import * as ProjectController from "./controllers/project.controller";
import * as ProjectFilesController from "./controllers/project_files.controller";
import * as TrackController from "./controllers/track.controller";
import * as UserController from "./controllers/user.controller"


const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.get('/health', optionalAuth, (req, res) => {
	res.status(200).json({ status: 'OK' });
});

router.get('/api/me', requireAuth, UserController.getUser)
router.post('/api/me', requireAuth, UserController.createUser)
router.put('/api/me/profile', requireAuth, UserController.updateUserProfile)
router.put('/api/me/profile_picture', requireAuth, upload.single('profilePicture'), UserController.updateProfilePicture)
router.get('/api/profile/:displayName', optionalAuth, UserController.getProfile);

router.get('/api/projects/all', requireAuth, ProjectController.getMine);
router.get('/api/projects/:projectId', requireAuth, ProjectController.getProject);
router.post('/api/projects/save_new', requireAuth, ProjectController.saveNew);
router.post('/api/projects/:projectId/studio', requireAuth, ProjectController.saveOverwrite);
router.get('/api/projects/:projectId/studio', requireAuth, ProjectController.load);
router.delete('/api/projects/:projectId/studio', requireAuth, ProjectController.deleteStudio);
router.patch('/api/projects/:projectId/rename', requireAuth, ProjectController.rename);
router.patch('/api/projects/:projectId/rename_front', requireAuth, ProjectController.renameFront);
router.get('/api/projects/:projectId/export', requireAuth, ProjectController.getExport);
router.get('/api/projects/:projectId/waveform', requireAuth, ProjectController.getWaveform);
router.get('/api/projects/:projectId/front', requireAuth, ProjectController.getFront);
router.post('/api/projects/:projectId/front', requireAuth, ProjectController.publish);
router.delete('/api/projects/:projectId/front', requireAuth, ProjectController.unpublish);

router.post('/api/projects/:projectId/files/save', requireAuth, upload.any(), ProjectFilesController.saveAudioFiles);
router.post('/api/projects/:projectId/files/get_all', requireAuth, ProjectFilesController.loadAudioFiles);

router.get('/api/track/:projectId/stream', optionalAuth, TrackController.stream);
router.get('/api/track/:projectId/download', optionalAuth, TrackController.download);
router.get('/api/track/:projectId/data', optionalAuth, TrackController.data);
router.get('/api/track/:projectId/waveform', optionalAuth, TrackController.waveform);
router.get('/api/track/:projectId/audio', optionalAuth, TrackController.audio);
router.post('/api/track/:projectId/comment', requireAuth, TrackController.leaveComment);
router.post('/api/track/:projectId/toggle_like', requireAuth, TrackController.toggleLike);
router.post('/api/track/:projectId/record_play', requireAuth, TrackController.recordPlay);
router.post('/api/tracks/newest', optionalAuth, TrackController.newest);
router.post('/api/tracks/hottest', optionalAuth, TrackController.hottest);
router.post('/api/search', optionalAuth, TrackController.search);

export default router;