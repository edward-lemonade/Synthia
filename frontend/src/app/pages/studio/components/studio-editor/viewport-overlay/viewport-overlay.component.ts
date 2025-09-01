import { AfterViewInit, ChangeDetectionStrategy, Component, effect, ElementRef, Injector, OnInit, runInInjectionContext, signal, ViewChild } from '@angular/core';
import { ViewportService } from '../../../services/viewport.service';
import { CommonModule } from '@angular/common';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { PlaybackMarkerComponent } from "./playback-marker/playback-marker.component";

@Component({
	selector: 'studio-editor-viewport-overlay',
	imports: [CommonModule, MatIconModule, PlaybackMarkerComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div #scrollContainer class="scroll-container">
			<div #scrollContent class="scroll-content" [style.width.px]="viewportService.totalWidth()">
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

				console.log(posX);
				if (this.scrollContainerRef?.nativeElement && this.scrollContainerRef.nativeElement.scrollLeft !== posX) {
					this.scrollContainerRef.nativeElement.scrollLeft = posX;
				}
			});
		});
	}

}
