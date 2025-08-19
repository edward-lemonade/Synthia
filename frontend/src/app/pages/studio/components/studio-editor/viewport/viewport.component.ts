import { AfterViewInit, ChangeDetectionStrategy, Component, computed, effect, ElementRef, Injector, OnInit, runInInjectionContext, signal, ViewChild } from '@angular/core';
import { ViewportService } from '../../../services/viewport.service';
import { CommonModule } from '@angular/common';
import { ProjectState } from '../../../services/project-state.service';
import { TrackComponent } from "./track/track.component";

@Component({
	selector: 'studio-editor-viewport',
	imports: [CommonModule, TrackComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div #container class="container">
			<canvas 
				#canvas 
				class="canvas"
				></canvas>
			<div #scrollContainer class="scroll-container" (scroll)="onScroll()">
				<div #tracks class="tracks" [style.width.px]="viewportService.totalWidth()">
					<viewport-track 
						*ngFor="let track of getTracks(); let i = index"
						class="track"
						[track]="track"
						[index]="i"
					/>
				</div>
			</div>
		</div>
	`,
	styleUrl: './viewport.component.scss'
})
export class ViewportComponent implements AfterViewInit {
	@ViewChild("canvas", {static: true}) canvasRef!: ElementRef<HTMLCanvasElement>;
	@ViewChild("scrollContainer", {static: true}) scrollContainerRef!: ElementRef<HTMLDivElement>;
	@ViewChild("tracks", {static: true}) tracksRef!: ElementRef<HTMLDivElement>;

	public DPR = window.devicePixelRatio || 1;
	canvasWidth = 0;
	canvasHeight = 0;
	styleWidth = 0;
	styleHeight = 0;

	constructor(
		private injector: Injector,
		public viewportService: ViewportService,
		public projectState : ProjectState,
	) {}

	getTracks() { return this.projectState.tracksState.arr(); }
	tracksHeight = signal(0);

	ngAfterViewInit(): void {
		const canvas = this.canvasRef.nativeElement;
		const ctx = canvas.getContext("2d")!;

		this.viewportService.registerVP(
			this.scrollContainerRef.nativeElement, canvas, ctx,
			this.scrollContainerRef.nativeElement.clientWidth, this.tracksRef.nativeElement.clientHeight
		);
		
		const observer = new ResizeObserver(() => {
			this.tracksHeight.set(this.tracksRef.nativeElement.clientHeight);

			this.viewportService.setupCanvas(
				canvas, ctx,
				this.scrollContainerRef.nativeElement.clientWidth, this.tracksRef.nativeElement.clientHeight
			);
		});
		observer.observe(this.tracksRef.nativeElement);

		runInInjectionContext(this.injector, () => {
			effect(() => {
				const posX = this.viewportService.windowPosX();
				const posY = this.viewportService.windowPosY();

				if (this.scrollContainerRef?.nativeElement && this.scrollContainerRef.nativeElement.scrollLeft !== posX) {
					this.isProgrammaticScroll = true;
					this.scrollContainerRef.nativeElement.scrollLeft = posX;
				}
				if (this.scrollContainerRef?.nativeElement && this.scrollContainerRef.nativeElement.scrollTop !== posY) {
					this.isProgrammaticScroll = true;
					this.scrollContainerRef.nativeElement.scrollTop = posY;
				}
			});
		});
	}



	private isProgrammaticScroll = false;
	onScroll(): void {
		if (!this.scrollContainerRef.nativeElement) return;
		
		if (this.isProgrammaticScroll) {
			this.isProgrammaticScroll = false; // reset flag
			return; 
		}

		const scrollLeft = this.scrollContainerRef.nativeElement.scrollLeft;
		const scrollTop = this.scrollContainerRef.nativeElement.scrollTop;

		this.viewportService.windowPosX.set(scrollLeft);
		this.viewportService.windowPosY.set(scrollTop);
	}
}
