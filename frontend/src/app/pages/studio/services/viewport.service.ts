import { Injectable, signal, computed, effect, Injector, runInInjectionContext } from '@angular/core';
import { ProjectState } from './project-state.service';
import { ProjectStateGlobals } from './substates';

@Injectable()
export class ViewportService {
	declare globalsState: ProjectStateGlobals;

	BASE_PIXELS_PER_MEASURE = 100;

	constructor(
		private injector: Injector,
		private projectState: ProjectState,
	) {
		this.globalsState = projectState.globalsState;
	}

	///////////////////////////////////////////////////////////////////////////////////////////////////////
	// FIELDS
	///////////////////////////////////////////////////////////////////////////////////////////////////////

	lastMeasure = signal(60);

	windowPosX = signal(0);
	windowPosY = signal(0);
	zoomFactor = signal(1);

	measureWidth = computed(() => this.BASE_PIXELS_PER_MEASURE * this.zoomFactor());
	beatWidth = computed(() => this.BASE_PIXELS_PER_MEASURE * this.zoomFactor() / this.globalsState.timeSignature().N)
	totalWidth = computed(() => this.measureWidth() * this.lastMeasure() );
	measurePosX = computed(() => this.windowPosX() / this.measureWidth() );

	snapToGrid = signal(false);
	smallestUnit = signal(1);

	CANVAS_PADDING = 30;

	setWindowPosX(position : number) { this.windowPosX.set(position); }
	setWindowPosY(position : number) { this.windowPosY.set(position); }
	setZoom(factor: number) { this.zoomFactor.set(Math.max(0.1, factor)); }

	adjustZoom(direction: number, mousePos: number, zoomSpeed = 0.02) {
		if (!this.VPHeaderContainer) return;

		const minMeasureLength = this.VPHeaderContainer.clientWidth / this.lastMeasure();
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
		const maxWindowPosX = this.BASE_PIXELS_PER_MEASURE * newZoomFactor * this.lastMeasure() - this.VPHeaderContainer.clientWidth;
		const clampedWindowPosX = Math.max(0, Math.min(newWindowPosX, maxWindowPosX));

		this.setZoom(newZoomFactor);
		this.setWindowPosX(clampedWindowPosX);
	}

	///////////////////////////////////////////////////////////////////////////////////////////////////////
	// CONVERSIONS
	///////////////////////////////////////////////////////////////////////////////////////////////////////

	mouseToPos(x: number, snap = this.snapToGrid()) {
		let pos = (this.windowPosX() + x) / this.measureWidth();
		if (snap) { pos = Math.floor(pos / this.smallestUnit()) * this.smallestUnit(); }
		return pos;
	}
	posToTime(pos: number) {
		return pos * this.globalsState.timeSignature().N  / this.globalsState.bpm() * 60; // in seconds
	}
	timeToPos(time: number) {
		return time/60 * this.globalsState.bpm() / this.globalsState.timeSignature().N; // in measures
	}

	///////////////////////////////////////////////////////////////////////////////////////////////////////
	// TRACKLIST SCROLL SYNC (vertical)
	///////////////////////////////////////////////////////////////////////////////////////////////////////

	private tracklistScrollable?: HTMLDivElement;
	registerTracklistScrollable(el: HTMLDivElement) { 
		this.tracklistScrollable = el; 
		runInInjectionContext(this.injector, () => {
			effect(() => {
				this.tracklistScrollable!.scrollTop = this.windowPosY();
			})
		});
	}


	///////////////////////////////////////////////////////////////////////////////////////////////////////
	// CANVASES
	///////////////////////////////////////////////////////////////////////////////////////////////////////

	private VPHeaderContainer?: HTMLDivElement; // VIEWPORT HEADER
	private VPHeaderCanvas?: HTMLCanvasElement;
	private VPHeaderCtx?: CanvasRenderingContext2D;

	private VPContainer?: HTMLDivElement; // VIEWPORT
	private VPCanvas?: HTMLCanvasElement;
	private VPCtx?: CanvasRenderingContext2D; 

	registerVPHeader(
		container: HTMLDivElement, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D,
		width: number, height: number
	) {
		this.VPHeaderContainer = container;
		this.VPHeaderCanvas = canvas;
		this.VPHeaderCtx = ctx;	

		this.setupCanvas(canvas, ctx, width, height, "header");

		runInInjectionContext(this.injector, () => { // horizontal scroll sync
			effect(() => {
				this.VPHeaderContainer!.scrollLeft = this.windowPosX();
			})
		});
	}
	registerVP(
		container: HTMLDivElement, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D,
		width: number, height: number
	) {
		this.VPContainer = container;
		this.VPCanvas = canvas;
		this.VPCtx = ctx;	

		this.setupCanvas(canvas, ctx, width, height, "viewport");
	}
	setupCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, width: number, height: number, src?: string) {
		const dpr = window.devicePixelRatio || 1;
		const pad = 2*this.CANVAS_PADDING;

		canvas.width = (width + pad) * dpr;
		canvas.style.width = (width + pad) + 'px';
		canvas.height = height * dpr;
		canvas.style.height = height + 'px';

		ctx.scale(dpr, dpr);
		ctx.translate(-this.CANVAS_PADDING, 0);
		ctx.lineWidth = 1;

		this.drawLines();
	}

	///////////////////////////////////////////////////////////////////////////////////////////////////////
	// LINE DRAWING
	///////////////////////////////////////////////////////////////////////////////////////////////////////

	private onViewportChanged = effect(() => {
		const startPos = this.windowPosX() - this.CANVAS_PADDING;
		const endPos = this.windowPosX() + this.VPHeaderCanvas!.width + this.CANVAS_PADDING;
		const measureWidth = this.measureWidth();
		const beatWidth = this.beatWidth();
		const zoom = this.zoomFactor();

		this.drawLines();
	})

	drawLines(): void {
		const canvas1 = this.VPHeaderCanvas;
		const ctx1 = this.VPHeaderCtx;
		const canvas2 = this.VPCanvas;
		const ctx2 = this.VPCtx;
		if (!canvas1 || !ctx1 || !canvas2 || !ctx2) { return; };

		ctx1.clearRect(
			-this.CANVAS_PADDING, 0, 
			canvas1.width + this.CANVAS_PADDING, canvas1.height
		)
		ctx2.clearRect(
			-this.CANVAS_PADDING, 0, 
			canvas2.width + this.CANVAS_PADDING, canvas2.height
		)

		const MAX_INTERVAL_WIDTH = 100;
		const MIN_MEASURE_WIDTH = 60;

		const startPos = this.windowPosX() - this.CANVAS_PADDING;
		const endPos = this.windowPosX() + canvas1.width + this.CANVAS_PADDING;

		// MEASURES
		const measureWidth = this.measureWidth();
		const drawMeasures: boolean = true;
		const stepSize = Math.max(1, Math.pow(2, Math.ceil(-Math.log2(measureWidth / MIN_MEASURE_WIDTH))));
		const startMeasure = Math.ceil(startPos / measureWidth);
		const endMeasure = Math.floor(endPos / measureWidth);
		
		// BEATS
		const beatWidth = this.beatWidth();
		const drawBeats: boolean = (measureWidth > MAX_INTERVAL_WIDTH);
		const startBeat = Math.ceil(startPos / beatWidth);
		const endBeat = Math.ceil(endPos / beatWidth);

		// SUBDIVISIONS
		const numSubdivisions = Math.log2(beatWidth / MAX_INTERVAL_WIDTH);
		const subdivisionWidth = (beatWidth / Math.pow(2, Math.ceil(numSubdivisions)))
		const drawSubdivisions: boolean = (numSubdivisions > 0);
		const startSubdivision = Math.ceil(startPos / subdivisionWidth);
		const endSubdivision = Math.floor(endPos / subdivisionWidth);
		
		let smallestUnit = stepSize;

		if (drawMeasures) {
			let beginJumping = startMeasure;
			if (stepSize > 1) {
				for (let i = startMeasure; i <= endMeasure; i += 1) {
					if ((i+1) % stepSize == 1) {
						beginJumping = i;
						break;
					}
					let x = i * measureWidth - startPos;
					if (x < -this.CANVAS_PADDING || x > canvas1.width + this.CANVAS_PADDING) continue // shouldn't happen but keep for safety
					
					this.drawMediumLine(ctx1, x, 30, 15);
					this.drawMediumLine(ctx2, x, canvas2.clientHeight, canvas2.clientHeight);
				}
			}

			for (let i = beginJumping; i <= endMeasure; i += stepSize) {
				let x = i * measureWidth - startPos;
				if (x < -this.CANVAS_PADDING || x > canvas1.width + this.CANVAS_PADDING) continue // shouldn't happen but keep for safety
				
				this.drawBigLine(ctx1, x, 30, 30);
				this.drawBigLine(ctx2, x, canvas2.clientHeight, canvas2.clientHeight);
				ctx1.strokeStyle = "rgba(239, 239, 239, 1)"
				ctx1.fillStyle = "rgba(239, 239, 239, 1)"
				ctx1.lineWidth = 1
				ctx1.fillText((i+1).toString(), x+4, 10)
			}
		}
		if (drawBeats) {
			smallestUnit = 1.0 / this.globalsState.timeSignature().N;

			for (let i = startBeat; i <= endBeat; i += 1) {
				const x = i * beatWidth - startPos;
				if (x < -this.CANVAS_PADDING || x > canvas1.width + this.CANVAS_PADDING) continue // shouldn't happen but keep for safety

				this.drawMediumLine(ctx1, x, 30, 15);
				this.drawMediumLine(ctx2, x, canvas2.clientHeight, canvas2.clientHeight);
			}
		}
		if (drawSubdivisions) {
			smallestUnit = (1.0 / this.globalsState.timeSignature().N) / numSubdivisions;

			for (let i = startSubdivision; i <= endSubdivision; i += 1) {
				const x = i * subdivisionWidth - startPos;
				if (x < -this.CANVAS_PADDING || x > canvas1.width + this.CANVAS_PADDING) continue // shouldn't happen but keep for safety

				this.drawSmallLine(ctx1, x, 30, 10);
				this.drawSmallLine(ctx2, x, canvas2.clientHeight, canvas2.clientHeight);
			}
		}

		this.smallestUnit.set(smallestUnit);
	}
	private drawBigLine(ctx: CanvasRenderingContext2D, x: number, y=30, length=30) {
		if (!ctx) return

		ctx.strokeStyle = "rgba(150, 150, 150, 0.2)"
		ctx.fillStyle = "rgba(150, 150, 150, 0.2)"
		ctx.lineWidth = 1

		ctx.beginPath()
		ctx.moveTo(x, y-length)
		ctx.lineTo(x, y)
		ctx.stroke()
	}
	private drawMediumLine(ctx: CanvasRenderingContext2D, x: number, y=30, length=15) {
		if (!ctx) return

		ctx.strokeStyle = "rgba(120, 120, 120, 0.2)"
		ctx.fillStyle = "rgba(120, 120, 120, 0.2)"
		ctx.lineWidth = 1

		ctx.beginPath()
		ctx.moveTo(x, y-length)
		ctx.lineTo(x, y)
		ctx.stroke()
	}
	private drawSmallLine(ctx: CanvasRenderingContext2D, x: number, y=30, length=10) {
		if (!ctx) return

		ctx.strokeStyle = "rgba(90, 90, 90, 0.2)"
		ctx.fillStyle = "rgba(90, 90, 90, 0.2)"
		ctx.lineWidth = 1

		ctx.beginPath()
		ctx.moveTo(x, y-length)
		ctx.lineTo(x, y)
		ctx.stroke()
	}
}
