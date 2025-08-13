import { Injectable, signal, computed, ElementRef, OnInit } from '@angular/core';
import { ProjectState } from '../state/project.state';
import { GlobalsState } from '../state/subservices/globals.state';

@Injectable()
export class ZoomScrollService {
	BASE_PIXELS_PER_MEASURE = 100;

	private timelineHeaderContainer?: HTMLDivElement;
	registerTimelineHeaderContainer(el: HTMLDivElement) { this.timelineHeaderContainer = el; }

	constructor(
		private projectState: ProjectState,
		private globalsState: GlobalsState,
	) {}

	lastMeasure = signal(60);

	windowPosX = signal(0);
	windowPosY = signal(0);
	zoomFactor = signal(1);

	measureWidth = computed(() => this.BASE_PIXELS_PER_MEASURE * this.zoomFactor());
	beatWidth = computed(() => this.BASE_PIXELS_PER_MEASURE * this.zoomFactor() / this.globalsState.get("timeSignature")().N)
	totalWidth = computed(() => this.measureWidth() * this.lastMeasure() );
	measurePosX = computed(() => this.windowPosX() / this.measureWidth() );

	setLastMeasure(m : number) { this.lastMeasure.set(m); }

	setWindowPosX(position : number) { this.windowPosX.set(position); }
	setWindowPosY(position : number) { this.windowPosY.set(position); }
	setZoom(factor: number) { this.zoomFactor.set(Math.max(0.1, factor)); }

	adjustZoom(direction: number, mousePos: number, zoomSpeed = 0.02) {
		if (!this.timelineHeaderContainer) return;

		const minMeasureLength = this.timelineHeaderContainer.clientWidth / this.lastMeasure();
		const maxMeasureLength = 512;

		// calculate new zoom factor
		const currentMeasureWidth = this.measureWidth();
		const newMeasureWidth = Math.exp(Math.log(currentMeasureWidth) + direction * zoomSpeed);
		const clampedMeasureWidth = Math.max(minMeasureLength, Math.min(maxMeasureLength, newMeasureWidth));
		const newZoomFactor = clampedMeasureWidth / this.BASE_PIXELS_PER_MEASURE;

		// keep mouse position centered
		const worldPos = this.windowPosX() + mousePos;
		const newWindowPosX = worldPos * (newZoomFactor / this.zoomFactor()) - mousePos;
		
		// clamp
		const maxWindowPosX = this.BASE_PIXELS_PER_MEASURE * newZoomFactor * this.lastMeasure() - this.timelineHeaderContainer.clientWidth;
		const clampedWindowPosX = Math.max(0, Math.min(newWindowPosX, maxWindowPosX));

		this.setZoom(newZoomFactor);
		this.setWindowPosX(clampedWindowPosX);
	}

}
