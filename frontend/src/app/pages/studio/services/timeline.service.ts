import { Injectable, signal, computed, ViewChild, ElementRef, OnInit } from '@angular/core';
import { ProjectState } from '../state/project.state';
import { GlobalsState } from '../state/subservices/globals.state';

@Injectable()
export class TimelineService {
	BASE_PIXELS_PER_MEASURE = 100;

	@ViewChild("body-timeline", {static: true}) timelineRef!: ElementRef<HTMLDivElement>;
	declare timelineDiv : HTMLDivElement; 

	constructor(
		private projectState: ProjectState,
		private globalsState: GlobalsState,
	) {}

	lastMeasure = signal(60);
	windowPosX = signal(0)

	zoomFactor = signal(1);
	pixelsPerMeasure = computed(() => this.BASE_PIXELS_PER_MEASURE * this.zoomFactor());
	totalWidth = computed(() => {
		console.log(this.pixelsPerMeasure() * this.lastMeasure());
		return this.pixelsPerMeasure() * this.lastMeasure()
	});

	setLastMeasure(m : number) {
		this.lastMeasure.set(m);
	}

	setWindowPosX(position : number) {
		this.windowPosX.set(position);
	}

	setZoom(factor: number) {
		this.zoomFactor.set(Math.max(0.1, factor));
	}

	adjustZoom(direction: number) {
		const minMeasureLength = 4;    // px per beat (very zoomed out)
		const maxMeasureLength = 1028;  // px per beat (very zoomed in)
		const zoomSpeed = 0.02; // smaller = slower zoom

		let logZoom = Math.log(this.pixelsPerMeasure());
		logZoom += direction * zoomSpeed;

		let newMeasureLength = Math.exp(logZoom);
  		newMeasureLength = Math.max(minMeasureLength, Math.min(maxMeasureLength, newMeasureLength));

		const newZoomFactor = newMeasureLength / this.BASE_PIXELS_PER_MEASURE;
		this.setZoom(newZoomFactor);
	}

}
