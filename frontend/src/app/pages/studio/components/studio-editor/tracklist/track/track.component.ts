import { ChangeDetectionStrategy, Component, computed, ElementRef, Input, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ZoomScrollService } from '../../../../services/zoom-scroll.service';
import { Track } from '@shared/types/studio';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ProjectState } from '@src/app/pages/studio/services/project-state.service';

@Component({
	selector: 'tracklist-track',
	imports: [CommonModule, MatIconModule, FormsModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="track">
			<div class="section">
				<div class="iconDiv">
					<img src={{iconPath}} alt="icon" class="icon">
				</div>
			</div>
			<div class="section">
				<div class="title">
					<mat-icon class="title-icon">edit</mat-icon>
					<input 
						class="title-input" 
						placeholder="Track" 
						type="text"
						[(ngModel)]="trackNameInput"
						(blur)="updateTrackName()">
				</div>
			</div>
			<div class="section">

			</div>
		</div>
	`,
	styleUrl: './track.component.scss'
})

export class TrackComponent implements OnInit {
	@Input() track!: Track;
	@Input() index!: number;

	DEFAULT_ICON = `assets/icons/microphone.svg`;
	iconPath = this.DEFAULT_ICON;

	constructor (
		public projectState : ProjectState,
		public zoomScrollService : ZoomScrollService,
	) {}

	ngOnInit() {
		this.iconPath = `assets/icons/${this.track.type}.svg`;
		this.trackNameInput.set(this.track.name);
	}

	trackNameInput = signal('')
	updateTrackName() {
		this.projectState.tracksState.modifyTrack(this.index, "name", this.trackNameInput());
	}


}
