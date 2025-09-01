import { Injectable, signal, computed, effect, Injector, runInInjectionContext } from '@angular/core';
import { StateService } from '../state/state.service';
import { ViewportService } from './viewport.service';

@Injectable()
export class PlaybackService { // SINGLETON
	private static _instance: PlaybackService;
	static get instance(): PlaybackService { return PlaybackService._instance; }

	constructor(
		private injector: Injector,
	) {
		PlaybackService._instance = this;
	}

	get viewportService() { return ViewportService.instance }

	// ==============================================================================================
	// Fields

	playbackPos = signal(1);
	playbackTime = computed(() => ViewportService.instance.posToTime(this.playbackPos()));
	playbackPx = computed(() => ViewportService.instance.posToPx(this.playbackPos()));

	setPlaybackPos(pos: number) { this.playbackPos.set(pos); };
	setPlaybackTime(time: number) { this.playbackPos.set(this.viewportService.timeToPos(time)); };
	setPlaybackPx(px: number) { this.playbackPos.set(this.viewportService.pxToPos(px)); };
}