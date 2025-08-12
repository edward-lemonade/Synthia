import { Component, effect, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { TimelineService } from '../../../services/timeline.service';
import { CommonModule } from '@angular/common';
import { ProjectState } from '../../../state/project.state';
import { GlobalsState } from '../../../state/subservices/globals.state';
import { TimeSigOptionsN } from '@shared/types/studio';

@Component({
	selector: 'studio-editor-timeline-header',
	imports: [CommonModule],
	providers: [ProjectState],
	template: `
		<div #container class="container" (wheel)="onWheel($event)">
			<canvas #canvas class="canvas" ></canvas>
		</div>
	`,
	styleUrl: './timeline-header.component.scss'
})

export class TimelineHeaderComponent implements OnInit {
	@ViewChild("container", {static: true}) containerRef!: ElementRef<HTMLDivElement>;
	@ViewChild("canvas", {static: true}) canvasRef!: ElementRef<HTMLCanvasElement>;
	declare canvas : HTMLCanvasElement;

	constructor(
		private timelineService: TimelineService,
		private globalsState: GlobalsState
	) {}

	ngOnInit(): void {
		this.canvas = this.canvasRef.nativeElement;
	}

	getWindowPosX(): number { return this.timelineService.windowPosX(); }
	getZoom(): number { return this.timelineService.zoomFactor(); }
	getTotalWidth() : number { return this.timelineService.totalWidth(); }
	adjustZoom(direction: number) { this.timelineService.adjustZoom(direction); }
	onWheel(event: WheelEvent) {
		if (event.ctrlKey) {
			event.preventDefault();
			
			const direction = event.deltaY > 0 ? -1 : 1;
			this.adjustZoom(direction);
		}
	}

	private onTimelineChanged = effect(() => {
		this.drawLines();
	})
	private drawLines(): void {
		const canvas = this.canvas
    	const ctx = canvas.getContext("2d")
		if (!ctx) return

		const container = this.containerRef.nativeElement

		const timeSigN = this.globalsState.get("timeSignature")().N;
		const scrollLeft = this.getWindowPosX() || 0
		const viewportWidth = container.clientWidth
		const zoom = this.getZoom()
		const bufferWidth = viewportWidth * 0.5 // 50% buffer on each side
		const visibleStartX = Math.max(0, scrollLeft - bufferWidth)
		const visibleEndX = Math.min(this.getTotalWidth(), scrollLeft + viewportWidth + bufferWidth)
		
		canvas.width = Math.max(this.getTotalWidth())
		canvas.height = 30
		ctx.clearRect(visibleStartX, 0, visibleEndX - visibleStartX, canvas.height)

		const MAX_INTERVAL_WIDTH = 100;
		const MIN_MEASURE_WIDTH = 60;

		const measureWidth = 100 * zoom; // MEASURE
		if (measureWidth < container.clientWidth) {
			const startMeasure = Math.ceil(visibleStartX / measureWidth)
			const endMeasure = Math.floor(visibleEndX / measureWidth)

			const measureJump = Math.max(1, Math.pow(2, Math.ceil(-Math.log2(measureWidth / MIN_MEASURE_WIDTH))));

			for (let i = startMeasure; i <= endMeasure; i += measureJump) {
				let x = i * measureWidth
				if (x < visibleStartX || x > visibleEndX) continue

				this.drawBigLine(x);
				ctx.fillText((i+1).toString(), x+8, 12)

				for (let j = 1; j < measureJump; j += 1) {
					x += measureWidth;
					this.drawMediumLine(x);
				}
			}
		}

		const beatWidth = measureWidth / timeSigN; // BEAT
		if (measureWidth > MAX_INTERVAL_WIDTH) {
			const startBeat = Math.ceil(visibleStartX / beatWidth)
			const endBeat = Math.floor(visibleEndX / beatWidth)

			for (let i = startBeat; i <= endBeat; i += 1) {
				const x = i * beatWidth
				if (x < visibleStartX || x > visibleEndX) continue

				this.drawMediumLine(x);
			}
		}
		
		const subdivisions = Math.ceil(Math.log2(beatWidth / MAX_INTERVAL_WIDTH)) // SUBDIVISIONS
		const subWidth = (beatWidth / Math.pow(2, subdivisions));
		if (subdivisions > 0) {
			const startSub = Math.ceil(visibleStartX / subWidth)
			const endSub = Math.floor(visibleEndX / subWidth)

			for (let i = startSub; i <= endSub; i += 1) {
				const x = i * subWidth
				if (x < visibleStartX || x > visibleEndX) continue

				this.drawSmallLine(x);
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

		ctx.strokeStyle = "rgba(255,255,255,0.5)"
		ctx.fillStyle = "rgba(255,255,255,0.5)"
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

		ctx.strokeStyle = "rgba(255,255,255,0.35)"
		ctx.fillStyle = "rgba(255,255,255,0.35)"
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

		ctx.strokeStyle = "rgba(255,255,255,0.2)"
		ctx.fillStyle = "rgba(255,255,255,0.2)"
		ctx.lineWidth = 1
		const LINE_LENGTH = 10

		ctx.beginPath()
		ctx.moveTo(x, 30-LINE_LENGTH)
		ctx.lineTo(x, 30)
		ctx.stroke()
	}
}
