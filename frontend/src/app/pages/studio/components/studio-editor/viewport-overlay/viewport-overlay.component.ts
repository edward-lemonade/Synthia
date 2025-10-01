import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    effect,
    ElementRef,
    Injector,
    runInInjectionContext,
    ViewChild,
} from '@angular/core';
import { ViewportService } from '../../../services/viewport.service';
import { CommonModule } from '@angular/common';
import { PlaybackMarkerComponent } from "./playback-marker/playback-marker.component";

@Component({
	selector: 'studio-editor-viewport-overlay',
	imports: [CommonModule, PlaybackMarkerComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div #scrollContainer class="scroll-container">
			<div #scrollContent class="scroll-content"[style.width.px]="viewportService.totalWidth()">
				<studio-editor-playback-marker/>
			</div>
		</div>
	`,
	styleUrl: './viewport-overlay.component.scss'
})

export class ViewportOverlayComponent implements AfterViewInit {
	@ViewChild("scrollContainer", {static: true}) scrollContainerRef!: ElementRef<HTMLDivElement>;
	@ViewChild("scrollContent", {static: true}) scrollContentRef!: ElementRef<HTMLDivElement>;

	public DPR = window.devicePixelRatio || 1;

	constructor(
		private injector: Injector,
		public viewportService: ViewportService,
	) {
	}

	ngAfterViewInit(): void {
		runInInjectionContext(this.injector, () => {
			effect(() => {
				const posX = this.viewportService.windowPosX();

				if (this.scrollContainerRef?.nativeElement && this.scrollContainerRef.nativeElement.scrollLeft !== posX) {
					this.scrollContainerRef.nativeElement.scrollLeft = posX;
				}

			});
		});

		const el = this.scrollContainerRef.nativeElement;
		el.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
		el.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
	}
}
