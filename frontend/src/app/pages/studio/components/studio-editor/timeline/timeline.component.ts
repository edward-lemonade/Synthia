import { Component, effect, signal } from '@angular/core';
import { TimelineService } from '../../../services/timeline.service';
import { CommonModule } from '@angular/common';
import { ProjectState } from '../../../state/project.state';

@Component({
	selector: 'studio-editor-timeline',
	imports: [CommonModule],
	providers: [ProjectState],
	template: `
		<div class="timeline">
			<p> BRUH </p>
		</div>
	`,
	styleUrl: './timeline.component.scss'
})
export class TimelineComponent {
	
}
