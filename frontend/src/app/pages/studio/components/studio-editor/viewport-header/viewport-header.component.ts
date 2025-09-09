import { AfterViewInit, ChangeDetectionStrategy, Component, effect, ElementRef, Injector, OnInit, runInInjectionContext, signal, ViewChild } from '@angular/core';
import { ViewportService } from '../../../services/viewport.service';
import { CommonModule } from '@angular/common';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { PlaybackMarkerComponent } from '../viewport-overlay/playback-marker/playback-marker.component';
import { TimelinePlaybackService } from '../../../services/timeline-playback.service';

@Component({
	selector: 'studio-editor-viewport-header',
	imports: [CommonModule, MatIconModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div #container class="container" (wheel)="onWheel($event)" (click)="onClick($event)">
			<canvas #canvas class="canvas"></canvas>
			<div class="controls">
				<button class="control-btn" (click)="onButtonZoomIn($event)">
					<mat-icon>zoom_in</mat-icon>
				</button>
				<button class="control-btn" (click)="onButtonZoomOut($event)">
					<mat-icon>zoom_out</mat-icon>
				</button>
				<button class="control-btn" 
					[class.active]="this.viewportService.snapToGrid()" 
					(click)="toggleSnap($event)">
					<mat-icon class="custom-icon" svgIcon="snap-to-grid"></mat-icon>
				</button>
			</div>
			<div #scrollContainer class="scroll-container">
				<div #scrollContent class="scroll-content" [style.width.px]="viewportService.totalWidth()">

				</div>
			</div>
			
		</div>
		
	`,
	styleUrl: './viewport-header.component.scss'
})

export class ViewportHeaderComponent implements AfterViewInit {
	@ViewChild("canvas", {static: true}) canvasRef!: ElementRef<HTMLCanvasElement>;
	@ViewChild("scrollContainer", {static: true}) scrollContainerRef!: ElementRef<HTMLDivElement>;
	@ViewChild("scrollContent", {static: true}) scrollContentRef!: ElementRef<HTMLDivElement>;

	public DPR = window.devicePixelRatio || 1;

	iconPath = '/assets/icons/magnet.svg';

	constructor(
		private injector: Injector,
		private matIconRegistry: MatIconRegistry,
    	private domSanitizer: DomSanitizer,
		public viewportService: ViewportService,
		public playbackService: TimelinePlaybackService,
	) {
		this.matIconRegistry.addSvgIcon(
			'snap-to-grid',
			this.domSanitizer.bypassSecurityTrustResourceUrl(this.iconPath)
		);
	}

	ngAfterViewInit(): void {
		const canvas = this.canvasRef.nativeElement;
		const ctx = canvas.getContext("2d")!;

		this.viewportService.registerVPHeader(
			this.scrollContainerRef.nativeElement, canvas, ctx,
			this.scrollContainerRef.nativeElement.clientWidth, this.scrollContainerRef.nativeElement.clientHeight
		);

		runInInjectionContext(this.injector, () => {
			effect(() => {
				const posX = this.viewportService.windowPosX();

				if (this.scrollContainerRef?.nativeElement && this.scrollContainerRef.nativeElement.scrollLeft !== posX) {
					this.scrollContainerRef.nativeElement.scrollLeft = posX;
				}
			});
		});
	}

	onClick(event: MouseEvent) {
		this.playbackService.setPlaybackPx(this.viewportService.mouseXToPx(event.clientX));
	}

	onWheel(event: WheelEvent) {
		if (event.ctrlKey) {
			event.preventDefault();
			
			const target = event.currentTarget as HTMLElement;
			const rect = target.getBoundingClientRect();
			const mouseX = event.clientX - rect.left;

			const direction = event.deltaY > 0 ? -1 : 1;
			this.viewportService.adjustZoom(direction, mouseX);
		} else {
			const scrollPos = 
				Math.min(this.scrollContainerRef.nativeElement.clientWidth, 
				Math.max(0, this.scrollContainerRef.nativeElement.scrollLeft + event.deltaY));
			if (scrollPos != this.viewportService.windowPosX()) {
				this.viewportService.setWindowPosX(scrollPos);
			}
		}
	}

	onButtonZoomIn(event: MouseEvent) { 
		this.viewportService.adjustZoom(1, this.scrollContainerRef.nativeElement!.clientWidth/2, 0.5); 
		event.stopPropagation();
	}
	onButtonZoomOut(event: MouseEvent) { 
		this.viewportService.adjustZoom(-1, this.scrollContainerRef.nativeElement!.clientWidth/2, 0.5); 
		event.stopPropagation();
	}
	toggleSnap(event: MouseEvent) { 
		this.viewportService.snapToGrid.set(!this.viewportService.snapToGrid())
		event.stopPropagation();
	}

}
