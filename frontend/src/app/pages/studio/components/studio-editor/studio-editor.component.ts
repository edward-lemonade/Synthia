import { AfterViewInit, Component, ElementRef, Injector, ViewChild, effect, runInInjectionContext } from '@angular/core';
import { MatToolbar } from "@angular/material/toolbar";
import { TracklistHeaderComponent } from "./tracklist-header/tracklist-header.component";
import { TimelineHeaderComponent } from "./timeline-header/timeline-header.component";
import { TracklistComponent } from "./tracklist/tracklist.component";
import { TimelineComponent } from "./timeline/timeline.component";
import { ProjectState } from '../../state/project.state';
import { TimelineService } from '../../services/timeline.service';

@Component({
	selector: 'app-studio-editor',
	imports: [MatToolbar, TracklistHeaderComponent, TimelineHeaderComponent, TracklistComponent, TimelineComponent],
	providers: [ProjectState, TimelineService],
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
	@ViewChild('topLeft', { static: true, read: ElementRef }) topLeft!: ElementRef<HTMLDivElement>;
	@ViewChild('topRight', { static: true, read: ElementRef }) topRight!: ElementRef<HTMLDivElement>;
	@ViewChild('lowerLeft', { static: true, read: ElementRef }) lowerLeft!: ElementRef<HTMLDivElement>;
	@ViewChild('lowerRight', { static: true, read: ElementRef }) lowerRight!: ElementRef<HTMLDivElement>;

	private isProgrammaticScroll = false;

	constructor (
		private injector: Injector,
		public timelineService: TimelineService,
	) {}

	ngAfterViewInit(): void {
		setTimeout(() => {
			if (
				this.topLeft?.nativeElement && 
				this.topRight?.nativeElement && 
				this.lowerLeft?.nativeElement
			) {
				[this.topLeft.nativeElement, this.topRight.nativeElement, this.lowerLeft.nativeElement].forEach(element => {
					element.addEventListener('scroll', (e) => {
						e.preventDefault();
						e.stopPropagation();
					});
				});
			}
		}, 100);

		runInInjectionContext(this.injector, () => {
			effect(() => {
				const pos = this.timelineService.windowPosX();
				//console.log(pos);
				if (this.lowerRight?.nativeElement && this.lowerRight.nativeElement.scrollLeft !== pos) {
					this.isProgrammaticScroll = true;
					this.lowerRight.nativeElement.scrollLeft = pos;
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
		
		// Sync horizontal with top-right
		/*
		if (this.topRight?.nativeElement) {
			this.topRight.nativeElement.style.transform = `translateX(-${scrollLeft}px)`;
		}
		
		// Sync vertical with lower-left  
		if (this.lowerLeft?.nativeElement) {
			this.lowerLeft.nativeElement.style.transform = `translateY(-${scrollTop}px)`;
		}*/
	}

}
