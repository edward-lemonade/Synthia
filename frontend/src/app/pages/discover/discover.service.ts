// projects.service.ts (enhanced with secure user interactions)
import { Injectable, Signal, WritableSignal, signal } from '@angular/core';
import { AppAuthService } from '@src/app/services/app-auth.service';
import { Router } from '@angular/router';
import axios from 'axios';
import { AudioFileData, Comment, CommentDTO, fillDates, InteractionState, ProjectFront, ProjectFrontDTO, ProjectMetadata } from '@shared/types';
import { base64ToArrayBuffer, CachedAudioFile, makeCacheAudioFile } from '@src/app/utils/audio';
import { UserService } from '@src/app/services/user.service';


@Injectable()
export class DiscoverService {
	constructor(
		private auth: AppAuthService,
		private userService: UserService,
		private router: Router,
	) {}



}