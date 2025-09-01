import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, Input, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewportService } from '../../../../services/viewport.service';
import { Track } from '@shared/types';

import { MatIconModule } from '@angular/material/icon';

import { FormsModule } from '@angular/forms';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { RotaryKnobComponent } from '@src/app/components/rotary-knob/rotary-knob.component';
import { MatDivider } from "@angular/material/divider";
import { MatMenuModule } from '@angular/material/menu';
import { SelectService } from '@src/app/pages/studio/services/select.service';
import { StateService } from '@src/app/pages/studio/state/state.service';
import { TracksService } from '@src/app/pages/studio/services/tracks.service';
import { StateNode } from '@src/app/pages/studio/state/state.factory';
import { PlaybackService } from '@src/app/pages/studio/services/playback.service';

@Component({
	selector: 'tracklist-track',
	imports: [CommonModule, MatIconModule, MatSliderModule, FormsModule, RotaryKnobComponent, MatButtonToggleModule, MatDivider, MatMenuModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="track"
			[style.--highlight-color]="color()"
			[style.background-color]="isSelected() ? colorSelectedBg() : 'transparent'"
			(click)="select()"
			>

			<div class="section" (click)="select()">
				<div class="iconContainer">
					<img src={{iconPath}} alt="icon" class="icon">
				</div>
			</div>
			
			<div class="section" (click)="select()">
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
					
					<button [matMenuTriggerFor]="trackOptionsMenu" class="track-options-btn">
						<mat-icon>more_vert</mat-icon>
					</button>

					<mat-menu #trackOptionsMenu="matMenu" [class]="'track-options-menu'">
						<div class="track-options-menu-content">
							<button class="track-options-menu-btn" (click)="openEditor()">
								<mat-icon>edit</mat-icon>
								<p>Edit</p>
							</button>
							<mat-divider class="divider"></mat-divider>
							<button class="track-options-menu-btn" (click)="menuMoveUp()">
								<mat-icon>keyboard_arrow_up</mat-icon>
								<p>Move up</p>
							</button>
							<button class="track-options-menu-btn" (click)="menuMoveDown()">
								<mat-icon>keyboard_arrow_down</mat-icon>
								<p>Move down</p>
							</button>
							<mat-divider class="divider"></mat-divider>
							<button class="track-options-menu-btn" (click)="menuDuplicate()">
								<mat-icon>content_copy</mat-icon>
								<p>Duplicate</p>
							</button>
							<button class="track-options-menu-btn" (click)="menuDelete()">
								<mat-icon>delete</mat-icon>
								<p>Delete</p>
							</button>
						</div>
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
	@Input() track!: StateNode<Track>;
	@Input() index!: number;

	DEFAULT_ICON = `assets/icons/microphone.svg`;
	iconPath = this.DEFAULT_ICON;

	constructor (
		public stateService : StateService,
		public tracksService : TracksService,
		public viewportService : ViewportService,
		public selectService : SelectService,
		public playbackService : PlaybackService,
	) {
		effect(() => {
			this.volumeInput.set(this.track.volume());
		});
		effect(() => {
			this.panInput.set(this.track.pan());
		});
		effect(() => {
			this.trackNameInput.set(this.track.name());
		});
	}

	ngOnInit() {
		this.iconPath = `assets/icons/${this.track.trackType()}.svg`;
		this.trackNameInput.set(this.track.name());
		this.volumeInput.set(this.track.volume());
		this.panInput.set(this.track.pan());
	}

	color = computed(() => this.track.color());
	colorSelectedBg = computed(() => this.selectService.selectedTrackBgColor(this.track.color()));
	isSelected = computed(() => this.selectService.selectedTrack() == this.track._id);
	select() { this.selectService.setSelectedTrack(this.track._id); }

	trackNameInput = signal('');
	updateTrackName() {
		this.track.name.set(this.trackNameInput());
	}

	volumeInput = signal(100);
	updateVolume() {
		this.track.volume.set(this.volumeInput());
		this.playbackService.updateNodeVolumeMute(this.track._id, this.volumeInput(), this.mute());
	}

	panInput = signal(0);
	updatePan() {
		this.track.pan.set(this.panInput());
		this.playbackService.updateNodePan(this.track._id, this.panInput());
	}

	mute = computed(() => this.track.mute());
	toggleMute() { this.track.mute.update(m => !m);this.playbackService.updateNodeVolumeMute(this.track._id, this.volumeInput(), this.mute()); }
	solo = computed(() => this.track.solo());
	toggleSolo() { this.track.solo.update(s => !s) }

	menuMoveUp() {
		this.tracksService.moveTrack(this.index, Math.max(0, this.index-1))
	}
	menuMoveDown() {
		this.tracksService.moveTrack(this.index, Math.min(this.tracksService.numTracks()-1, this.index+1))
	}
	menuDuplicate() {
		this.tracksService.duplicateTrack(this.index);
	}
	menuDelete() {
		this.tracksService.deleteTrack(this.index);
	}

	openEditor() {
		
	}
}
