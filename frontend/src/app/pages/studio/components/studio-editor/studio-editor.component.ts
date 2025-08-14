import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Injector, ViewChild, effect, runInInjectionContext } from '@angular/core';
import { MatToolbar } from "@angular/material/toolbar";
import { TracklistHeaderComponent } from "./tracklist-header/tracklist-header.component";
import { TimelineHeaderComponent } from "./timeline-header/timeline-header.component";
import { TracklistComponent } from "./tracklist/tracklist.component";
import { TimelineComponent } from "./timeline/timeline.component";
import { ProjectState } from '../../state/project.state';
import { ZoomScrollService } from '../../services/zoom-scroll.service';

@Component({
	selector: 'app-studio-editor',
	imports: [MatToolbar, TracklistHeaderComponent, TimelineHeaderComponent, TracklistComponent, TimelineComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<mat-toolbar class="headers">
			<studio-editor-tracklist-header class="container headers-tracklist-container" #topLeft/>
			<studio-editor-timeline-header class="container headers-timeline-container" #topRight/>
		</mat-toolbar>

		<div class="body">
			<studio-editor-tracklist class="container body-tracklist" #lowerLeft/>
			<studio-editor-timeline class="container body-timeline" #lowerRight (scroll)="onScroll()"/>
		</div>
	`,
	styleUrl: './studio-editor.component.scss'
})
export class StudioEditorComponent implements AfterViewInit {
	@ViewChild(TimelineHeaderComponent, { static: true }) topRightChild!: TimelineHeaderComponent;
	@ViewChild(TracklistComponent, { static: true }) lowerLeftChild!: TracklistComponent;

	@ViewChild('topLeft', { static: true, read: ElementRef }) topLeft!: ElementRef<HTMLDivElement>;
	@ViewChild('topRight', { static: true, read: ElementRef }) topRight!: ElementRef<HTMLDivElement>;
	@ViewChild('lowerLeft', { static: true, read: ElementRef }) lowerLeft!: ElementRef<HTMLDivElement>;
	@ViewChild('lowerRight', { static: true, read: ElementRef }) lowerRight!: ElementRef<HTMLDivElement>;

	private isProgrammaticScroll = false;

	constructor (
		private injector: Injector,
		public timelineService: ZoomScrollService,
	) {}

	ngAfterViewInit(): void {
		runInInjectionContext(this.injector, () => {
			effect(() => {
				const posX = this.timelineService.windowPosX();
				const posY = this.timelineService.windowPosY();

				if (this.lowerRight?.nativeElement && this.lowerRight.nativeElement.scrollLeft !== posX) {
					this.isProgrammaticScroll = true;
					this.lowerRight.nativeElement.scrollLeft = posX;
				}
				if (this.lowerRight?.nativeElement && this.lowerRight.nativeElement.scrollTop !== posY) {
					this.isProgrammaticScroll = true;
					this.lowerRight.nativeElement.scrollTop = posY;
				}
			});
		});
	}

	onScroll(): void {
		if (!this.lowerRight?.nativeElement) return;
		
		if (this.isProgrammaticScroll) {
			this.isProgrammaticScroll = false; // reset flag
			return; 
		}

		const scrollLeft = this.lowerRight.nativeElement.scrollLeft;
		const scrollTop = this.lowerRight.nativeElement.scrollTop;

		this.timelineService.windowPosX.set(scrollLeft);
		this.timelineService.windowPosY.set(scrollTop);
	}

}
