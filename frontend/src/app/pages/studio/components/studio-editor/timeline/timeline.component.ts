import { Component, effect, signal } from '@angular/core';
import { TimelineService } from '../../../services/timeline.service';
import { CommonModule } from '@angular/common';
import { ProjectState } from '../../../state/project.state';

@Component({
	selector: 'studio-editor-timeline',
	imports: [CommonModule],
	providers: [ProjectState],
	template: `
		<div 
			class="timeline"
			[style.width.px]="timelineService.totalWidth()">
			<p> BRUH </p>
		</div>
	`,
	styleUrl: './timeline.component.scss'
})
export class TimelineComponent {
	constructor(
		public timelineService: TimelineService
	) {}
}
