import { AfterViewInit, Component, effect, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { ZoomScrollService } from '../../../services/zoom-scroll.service';
import { CommonModule } from '@angular/common';
import { ProjectState } from '../../../state/project.state';
import { GlobalsState } from '../../../state/subservices/globals.state';
import { TimeSigOptionsN } from '@shared/types/studio';
import { MatIconModule } from '@angular/material/icon';

@Component({
	selector: 'studio-editor-timeline-header',
	imports: [CommonModule, MatIconModule],
	providers: [ProjectState],
	template: `
		<div #container class="container" (wheel)="onWheel($event)">
			<canvas #canvas class="canvas"></canvas>
			<div class="controls">
				<button class="control-btn" (click)="onButtonZoomIn()">
					<mat-icon>zoom_in</mat-icon>
				</button>
				<button class="control-btn" (click)="onButtonZoomOut()">
					<mat-icon>zoom_out</mat-icon>
				</button>
				<button class="control-btn">
					<mat-icon>grid_3x3</mat-icon>
				</button>
			</div>
			<div #timeline_header_scrollable class="scrollable"></div>
		</div>
	`,
	styleUrl: './timeline-header.component.scss'
})

export class TimelineHeaderComponent implements OnInit, AfterViewInit {
	@ViewChild("container", {static: true}) containerRef!: ElementRef<HTMLDivElement>;
	@ViewChild("canvas", {static: true}) canvasRef!: ElementRef<HTMLCanvasElement>;
	declare container : HTMLDivElement;
	declare canvas : HTMLCanvasElement;
	declare ctx : CanvasRenderingContext2D;

	CANVAS_PADDING = 20;

	constructor(
		public timelineService: ZoomScrollService,
		private globalsState: GlobalsState
	) {}

	ngOnInit(): void {
		this.container = this.containerRef.nativeElement;
		this.canvas = this.canvasRef.nativeElement;
		this.timelineService.registerTimelineHeaderContainer(this.container);
	}
	ngAfterViewInit(): void {
		const dpr = window.devicePixelRatio || 1;

		this.canvas.width = (this.container.clientWidth + 60) * dpr;
		this.canvas.height = (this.container.clientHeight) * dpr;
		this.canvas.style.width = (this.container.clientWidth + 60) + 'px';
		this.canvas.style.height = (this.container.clientHeight) + 'px';

		this.ctx = this.canvas.getContext("2d")!;
		this.ctx.scale(dpr, dpr);
		this.ctx.translate(-this.CANVAS_PADDING, 0);

		this.ctx.lineWidth = 1; // in CSS pixels
		this.drawLines();
	}

	onWheel(event: WheelEvent) {
		if (event.ctrlKey) {
			event.preventDefault();
			
			// Get the element that received the wheel event
			const target = event.currentTarget as HTMLElement;
			const rect = target.getBoundingClientRect();
			const mouseX = event.clientX - rect.left;

			const direction = event.deltaY > 0 ? -1 : 1;
			this.timelineService.adjustZoom(direction, mouseX);
		}
	}

	private onTimelineChanged = effect(() => {
		const startPos = this.timelineService.windowPosX() - this.CANVAS_PADDING;
		const endPos = this.timelineService.windowPosX() + this.canvas.width + this.CANVAS_PADDING;
		const measureWidth = this.timelineService.measureWidth();
		const beatWidth = this.timelineService.beatWidth();
		this.drawLines();
	})
	private drawLines(): void {
		const canvas = this.canvas;
    	const ctx = this.ctx;

		if (!ctx) { return; }
		ctx.clearRect(
			-this.CANVAS_PADDING, 0, 
			this.canvas.width + this.CANVAS_PADDING, canvas.height
		)

		const MAX_INTERVAL_WIDTH = 100;
		const MIN_MEASURE_WIDTH = 60;

		const startPos = this.timelineService.windowPosX() - this.CANVAS_PADDING;
		const endPos = this.timelineService.windowPosX() + this.canvas.width + this.CANVAS_PADDING;

		// MEASURES
		const measureWidth = this.timelineService.measureWidth();
		const drawMeasures: boolean = true;
		const stepSize = Math.max(1, Math.pow(2, Math.ceil(-Math.log2(measureWidth / MIN_MEASURE_WIDTH))));
		const startMeasure = Math.ceil(startPos / measureWidth);
		const endMeasure = Math.floor(endPos / measureWidth);
		
		// BEATS
		const beatWidth = this.timelineService.beatWidth();
		const drawBeats: boolean = (measureWidth > MAX_INTERVAL_WIDTH);
		const startBeat = Math.ceil(startPos / beatWidth);
		const endBeat = Math.ceil(endPos / beatWidth);

		// SUBDIVISIONS
		const numSubdivisions = Math.log2(beatWidth / MAX_INTERVAL_WIDTH);
		const subdivisionWidth = (beatWidth / Math.pow(2, Math.ceil(numSubdivisions)))
		const drawSubdivisions: boolean = (numSubdivisions > 0);
		const startSubdivision = Math.ceil(startPos / subdivisionWidth);
		const endSubdivision = Math.floor(endPos / subdivisionWidth);

		if (drawSubdivisions) {
			for (let i = startSubdivision; i <= endSubdivision; i += 1) {
				const x = i * subdivisionWidth - startPos;
				if (x < -this.CANVAS_PADDING || x > canvas.width + this.CANVAS_PADDING) continue // shouldn't happen but keep for safety

				this.drawSmallLine(x);
			}
		}
		if (drawBeats) {
			for (let i = startBeat; i <= endBeat; i += 1) {
				const x = i * beatWidth - startPos;
				if (x < -this.CANVAS_PADDING || x > canvas.width + this.CANVAS_PADDING) continue // shouldn't happen but keep for safety

				this.drawMediumLine(x);
			}
		}
		if (drawMeasures) {
			let beginJumping = startMeasure;
			if (stepSize > 1) {
				for (let i = startMeasure; i <= endMeasure; i += 1) {
					if ((i+1) % stepSize == 1) {
						beginJumping = i;
						break;
					}
					let x = i * measureWidth - startPos;
					if (x < -this.CANVAS_PADDING || x > canvas.width + this.CANVAS_PADDING) continue // shouldn't happen but keep for safety
					
					this.drawMediumLine(x);
				}
			}

			for (let i = beginJumping; i <= endMeasure; i += stepSize) {
				let x = i * measureWidth - startPos;
				if (x < -this.CANVAS_PADDING || x > canvas.width + this.CANVAS_PADDING) continue // shouldn't happen but keep for safety
				
				this.drawBigLine(x);
				ctx.strokeStyle = "rgba(239, 239, 239, 1)"
				ctx.fillStyle = "rgba(239, 239, 239, 1)"
				ctx.lineWidth = 1
				ctx.fillText((i+1).toString(), x+4, 10)

				for (let j = 1; j < stepSize; j += 1) {
					x += measureWidth;
					console.log(i+j);
					this.drawMediumLine(x);
				}
			}
		}

		/*
		// Draw playhead
		const playheadX = this.currentTime * pixelsPerSecond
		if (playheadX >= visibleStartX && playheadX <= visibleEndX) {
			ctx.strokeStyle = "#ef4444" // red-500
			ctx.lineWidth = 1
			ctx.beginPath()
			ctx.moveTo(playheadX, 0)
			ctx.lineTo(playheadX, canvas.height)
			ctx.stroke()
		}*/
	}
	private drawBigLine(x: number) {
		const canvas = this.canvas
    	const ctx = canvas.getContext("2d")
		if (!ctx) return

		ctx.strokeStyle = "rgba(150, 150, 150, 1)"
		ctx.fillStyle = "rgba(150, 150, 150, 1)"
		ctx.lineWidth = 1
		const LINE_LENGTH = 30

		ctx.beginPath()
		ctx.moveTo(x, 30-LINE_LENGTH)
		ctx.lineTo(x, 30)
		ctx.stroke()
	}
	private drawMediumLine(x: number) {
		const canvas = this.canvas
    	const ctx = canvas.getContext("2d")
		if (!ctx) return

		ctx.strokeStyle = "rgba(120, 120, 120, 1)"
		ctx.fillStyle = "rgba(120, 120, 120, 1)"
		ctx.lineWidth = 1
		const LINE_LENGTH = 15

		ctx.beginPath()
		ctx.moveTo(x, 30-LINE_LENGTH)
		ctx.lineTo(x, 30)
		ctx.stroke()
	}
	private drawSmallLine(x: number) {
		const canvas = this.canvas
    	const ctx = canvas.getContext("2d")
		if (!ctx) return

		ctx.strokeStyle = "rgba(90, 90, 90, 1)"
		ctx.fillStyle = "rgba(90, 90, 90, 1)"
		ctx.lineWidth = 1
		const LINE_LENGTH = 10

		ctx.beginPath()
		ctx.moveTo(x, 30-LINE_LENGTH)
		ctx.lineTo(x, 30)
		ctx.stroke()
	}

	onButtonZoomIn() { this.timelineService.adjustZoom(1, this.container!.clientWidth/2, 0.5); }
	onButtonZoomOut() { this.timelineService.adjustZoom(-1, this.container!.clientWidth/2, 0.5); }
}
