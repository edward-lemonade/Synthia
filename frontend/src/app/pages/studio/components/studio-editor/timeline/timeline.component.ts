import { ChangeDetectionStrategy, Component, effect, signal } from '@angular/core';
import { ZoomScrollService } from '../../../services/zoom-scroll.service';
import { CommonModule } from '@angular/common';
import { ProjectState } from '../../../state/project.state';
import { TracksState } from '../../../state/subservices/tracks.state';

@Component({
	selector: 'studio-editor-timeline',
	imports: [CommonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div 
			class="timeline"
			[style.width.px]="zoomScrollService.totalWidth()">
			<div class="tracks">
				<div 
					*ngFor="let track of getTracks(); let i = index"
					class="track"
					>
					{{ track.name }}
				</div>
			</div>
		</div>
	`,
	styleUrl: './timeline.component.scss'
})
export class TimelineComponent {
	constructor(
		public zoomScrollService: ZoomScrollService,
		public tracksState : TracksState,
	) {}

	getTracks() { 
		return this.tracksState.get("arr")() 
	}
}
