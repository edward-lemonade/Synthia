import { ChangeDetectionStrategy, Component, computed, ElementRef, Input, OnInit, signal, ViewChild } from '@angular/core';
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
import { RegionSelectService } from '@src/app/pages/studio/services/region-select.service';
import { StateService } from '@src/app/pages/studio/state/state.service';
import { TracksService } from '@src/app/pages/studio/services/tracks.service';

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
	@Input() track!: Track;
	@Input() index!: number;

	DEFAULT_ICON = `assets/icons/microphone.svg`;
	iconPath = this.DEFAULT_ICON;

	get tracks() { return this.stateService.state.studio.tracks }

	constructor (
		public stateService : StateService,
		public tracksService : TracksService,
		public viewportService : ViewportService,
		public regionSelectService : RegionSelectService,
	) {}

	ngOnInit() {
		this.iconPath = `assets/icons/${this.track.trackType}.svg`;
		this.trackNameInput.set(this.track.name);
		this.volumeInput.set(this.track.volume);
		this.panInput.set(this.track.pan);
	}

	color = computed(() => this.track.color);
	colorSelectedBg = computed(() => this.regionSelectService.selectedTrackBgColor(this.track.color));
	isSelected = computed(() => this.regionSelectService.selectedTrack() == this.index);
	select() { this.regionSelectService.setSelectedTrack(this.index); }

	trackNameInput = signal('');
	updateTrackName() {
		this.tracks()[this.index].name.set(this.trackNameInput());
	}

	volumeInput = signal(100);
	updateVolume() {
		this.tracks()[this.index].volume.set(this.volumeInput());
	}

	panInput = signal(0);
	updatePan() {
		this.tracks()[this.index].pan.set(this.panInput());
	}

	mute = computed(() => this.tracks()[this.index].mute());
	toggleMute() { this.tracks()[this.index].mute.update(m => !m) }
	solo = computed(() => this.tracks()[this.index].solo());
	toggleSolo() { this.tracks()[this.index].solo.update(s => !s) }

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
