import { Injectable, signal, computed, effect, Injector, runInInjectionContext } from '@angular/core';
import { StateService } from '../state/state.service';
import { ViewportService } from './viewport.service';

@Injectable()
export class PlaybackService { // SINGLETON
	private static _instance: PlaybackService;
	static get instance(): PlaybackService { return PlaybackService._instance; }

	constructor(private injector: Injector) {
		PlaybackService._instance = this;
	}

	get viewportService() { return ViewportService.instance }

	// ==============================================================================================
	// Fields

	playbackPos = signal(0);
	playbackTime = computed(() => ViewportService.instance.posToTime(this.playbackPos()));
	playbackPx = computed(() => ViewportService.instance.posToPx(this.playbackPos()));

	setPlaybackPos(pos: number) { this.playbackPos.set(pos); }
	setPlaybackTime(time: number) { this.playbackPos.set(this.viewportService.timeToPos(time)); }
	setPlaybackPx(px: number) { this.playbackPos.set(this.viewportService.pxToPos(px)); }

	isPlaying = signal(false);
	playbackLineRef?: HTMLDivElement;

	private startTime = 0;
	private basePos = 0;

	registerPlaybackLine(div: HTMLDivElement) {
		this.playbackLineRef = div;
	}

	play() {
		if (!this.playbackLineRef) return;
		if (this.isPlaying()) return; // already playing

		this.isPlaying.set(true);

		this.startTime = performance.now();
		this.basePos = this.playbackPos();

		const step = (now: number) => {
			if (!this.isPlaying()) return;

			const elapsedSec = (now - this.startTime) / 1000;
			const pos = this.viewportService.timeToPos(elapsedSec);
			const px = this.viewportService.posToPx(pos);

			this.playbackLineRef!.style.transform = `translateX(${px}px)`;

			requestAnimationFrame(step);
		};

		requestAnimationFrame(step);
	}

	pause() {
		if (!this.isPlaying()) return;
		this.isPlaying.set(false);

		const now = performance.now();
		const elapsedSec = (now - this.startTime) / 1000;
		const pos = this.basePos + this.viewportService.timeToPos(elapsedSec);

		this.setPlaybackPos(pos);
		this.playbackLineRef!.style.transform = `translateX(${0}px)`;
	}
}