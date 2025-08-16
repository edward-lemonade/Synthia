import { ChangeDetectionStrategy, Component, computed, ElementRef, Input, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ZoomScrollService } from '../../../../services/zoom-scroll.service';
import { Track } from '@shared/types/studio';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ProjectState } from '@src/app/pages/studio/services/project-state.service';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { RotaryKnobComponent } from '@src/app/components/rotary-knob/rotary-knob.component';
import { MatDivider } from "@angular/material/divider";
import { MatMenuModule } from '@angular/material/menu';

@Component({
	selector: 'tracklist-track',
	imports: [CommonModule, MatIconModule, MatSliderModule, FormsModule, RotaryKnobComponent, MatButtonToggleModule, MatDivider, MatMenuModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="track"
			[style.--highlight-color]="color()"
			>

			<div class="section">
				<div class="iconContainer">
					<img src={{iconPath}} alt="icon" class="icon">
				</div>
			</div>
			
			<div class="section">
				<div class="row upper-controls">
					<div class="title">
						<input 
							class="title-input" 
							placeholder="Track" 
							type="text"
							[(ngModel)]="trackNameInput"
							(change)="updateTrackName()"/>
					</div>

					<span class="spacer"></span>
					
					<button [matMenuTriggerFor]="trackOptionsMenu" class="track-menu-btn">
						<mat-icon>more_vert</mat-icon>
					</button>

					<mat-menu #trackOptionsMenu="matMenu" [class]="'track-options-menu'">
						<button mat-menu-item (click)="menuMoveUp()">
							<p>Move up</p>
						</button>
						<button mat-menu-item (click)="menuMoveDown()">
							<p>Move down</p>
						</button>
						<mat-divider></mat-divider>
						<button mat-menu-item (click)="menuDuplicate()">
							<p>Duplicate</p>
						</button>
						<button mat-menu-item (click)="menuDelete()">
							<p>Delete</p>
						</button>
					</mat-menu>
				</div>

				<div class="row lower-controls">
					<div class="volume-slider-container">
						<mat-slider min="0" max="100" step="1" class="volume-slider" [style.--slider-color]="color()">
							<input matSliderThumb 
								[(ngModel)]="volumeInput" 
								(change)="updateVolume()"
								>
						</mat-slider>
					</div>

					<app-rotary-knob 
						[(ngModel)]="panInput"
						(blur)="updatePan()"
						[min]="-100"
						[max]="100" 
						[step]="1"
						[precision]="1"
						[size]="24"
						[color]="color()"
						>
					</app-rotary-knob>
					
					<mat-button-toggle-group multiple class="ms-btn-group">
						<button 	class="ms-btn" [class.selected]="mute()" (click)="toggleMute()">M</button>
						<mat-divider 	class="divider" [vertical]="true"></mat-divider>
						<button 	class="ms-btn" [class.selected]="solo()" (click)="toggleSolo()">S</button>
					</mat-button-toggle-group>
				</div>
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
		this.volumeInput.set(this.track.volume);
		this.panInput.set(this.track.pan);
	}

	trackNameInput = signal('');
	updateTrackName() {
		this.projectState.tracksState.modifyTrack(this.index, "name", this.trackNameInput());
	}

	volumeInput = signal(100);
	updateVolume() {
		this.projectState.tracksState.modifyTrack(this.index, "volume", this.volumeInput());
	}

	panInput = signal(0);
	updatePan() {
		this.projectState.tracksState.modifyTrack(this.index, "pan", this.panInput());
	}

	color = computed(() => this.track.color);
	mute = computed(() => this.track.mute);
	toggleMute() { this.projectState.tracksState.modifyTrack(this.index, "mute", !this.mute()); console.log(this.mute()) }
	solo = computed(() => this.track.solo);
	toggleSolo() { this.projectState.tracksState.modifyTrack(this.index, "solo", !this.solo()); console.log(this.solo()) }

	menuMoveUp() {
		this.projectState.tracksState.moveTrack(this.index, Math.max(0, this.index-1))
	}
	menuMoveDown() {
		this.projectState.tracksState.moveTrack(this.index, Math.min(this.projectState.tracksState.numTracks()-1, this.index+1))
	}
	menuDuplicate() {
		this.projectState.tracksState.duplicateTrack(this.index);
	}
	menuDelete() {
		this.projectState.tracksState.deleteTrack(this.index);
	}
}
