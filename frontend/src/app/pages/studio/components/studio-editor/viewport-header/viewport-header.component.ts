import { AfterViewInit, ChangeDetectionStrategy, Component, effect, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { ViewportService } from '../../../services/viewport.service';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
	selector: 'studio-editor-viewport-header',
	imports: [CommonModule, MatIconModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
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
			<div #scrollContainer class="scroll-container">
				<div class="scroll-content" [style.width.px]="viewportService.totalWidth()"> 
					
				</div>
			</div>
		</div>
	`,
	styleUrl: './viewport-header.component.scss'
})

export class ViewportHeaderComponent implements AfterViewInit {
	@ViewChild("canvas", {static: true}) canvasRef!: ElementRef<HTMLCanvasElement>;
	@ViewChild("scrollContainer", {static: true}) scrollContainerRef!: ElementRef<HTMLDivElement>;

	public DPR = window.devicePixelRatio || 1;

	constructor(
		public viewportService: ViewportService,
	) {}

	ngAfterViewInit(): void {
		const canvas = this.canvasRef.nativeElement;
		const ctx = canvas.getContext("2d")!;

		this.viewportService.registerVPHeader(
			this.scrollContainerRef.nativeElement, canvas, ctx,
			this.scrollContainerRef.nativeElement.clientWidth, this.scrollContainerRef.nativeElement.clientHeight
		);

		this.scrollContainerRef.nativeElement.addEventListener('wheel', (event: WheelEvent) => {
			if (!event.ctrlKey) {
				const scrollPos = 
					Math.min(this.scrollContainerRef.nativeElement.clientWidth, 
					Math.max(0, this.scrollContainerRef.nativeElement.scrollLeft + event.deltaY));
				if (scrollPos != this.viewportService.windowPosX()) {
					this.viewportService.setWindowPosX(scrollPos);
				}
			}
		});
	}

	onWheel(event: WheelEvent) {
		if (event.ctrlKey) {
			event.preventDefault();
			
			const target = event.currentTarget as HTMLElement;
			const rect = target.getBoundingClientRect();
			const mouseX = event.clientX - rect.left;

			const direction = event.deltaY > 0 ? -1 : 1;
			this.viewportService.adjustZoom(direction, mouseX);
		}
	}

	onButtonZoomIn() { this.viewportService.adjustZoom(1, this.scrollContainerRef.nativeElement!.clientWidth/2, 0.5); }
	onButtonZoomOut() { this.viewportService.adjustZoom(-1, this.scrollContainerRef.nativeElement!.clientWidth/2, 0.5); }
}
