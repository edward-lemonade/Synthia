import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewportService } from '../../../services/viewport.service';
import { TrackComponent } from "./track/track.component";
import { ProjectState } from '../../../services/project-state.service';

@Component({
	selector: 'studio-editor-tracklist',
	imports: [CommonModule, TrackComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div #scrollable class="container" (scroll)="onScroll()">
			<div class="tracks">
				<tracklist-track
					*ngFor="let track of getTracks(); let i = index"
					[track]="track"
					[index]="i"
				/>
			</div>
		</div>
	`,
	styleUrl: './tracklist.component.scss'
})
export class TracklistComponent implements OnInit {
	@ViewChild('scrollable', { static: true, read: ElementRef }) scrollable!: ElementRef<HTMLDivElement>;

	constructor (
		public projectState : ProjectState,
		public viewportService : ViewportService,
	) {}

	ngOnInit() {
		this.viewportService.registerTracklistScrollable(this.scrollable.nativeElement);
  	}

	getTracks() { 
		return this.projectState.tracksState.tracks() 
	}

	onScroll() {
		const scrollPos = this.scrollable.nativeElement.scrollTop;
		if (scrollPos != this.viewportService.windowPosY()) {
			this.viewportService.setWindowPosY(scrollPos);
		}
	}
}
