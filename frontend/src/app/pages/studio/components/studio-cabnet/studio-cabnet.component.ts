import { CommonModule } from "@angular/common";
import { TrackType, MidiTrackType, AudioTrackType, Track } from "@shared/types";
import { ChangeDetectionStrategy, Component, computed, Injector, runInInjectionContext } from "@angular/core";
import { CabnetService } from "../../services/cabnet.service";

import { MatDivider } from "@angular/material/divider";
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MIDI_DRUM_MAPPING } from "../../services/synths/presets/drums";

@Component({
	selector: 'app-studio-cabnet',
	imports: [CommonModule, MatDivider, MatButtonModule, MatButtonToggleModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="cabnet-container" [style.height.px]="cabnetService.isOpen() ? openHeight : closedHeight">
			
			<div class="outlet">
				<ng-container *ngComponentOutlet="cabnetService.selectedTabComponent()"></ng-container>
			</div>

			<div class="tabs-row">
				<mat-button-toggle-group class='btn-group'>
					<ng-container *ngFor="let tab of tabEntries(); let i = index">
						<button 
							class="btn"
							[class.selected]="selectedTabIndex === tab.index"
							(click)="onTabClick(tab.index)">
							{{ tab.name }}
						</button>
						
						<mat-divider 
							*ngIf="i < tabEntries().length - 1"
							class="divider" 
							[vertical]="true">
						</mat-divider>
					</ng-container>
				</mat-button-toggle-group>
			</div>

		</div>
	`,
	styleUrl: './studio-cabnet.component.scss'
})

export class StudioCabnetComponent {
	MidiTrackType = MidiTrackType;
	AudioTrackType = AudioTrackType;

	constructor (
		injector: Injector,
		public cabnetService: CabnetService,
	) {}

	openHeight = 400;
	closedHeight = 40;

	get selectedTabIndex() {return this.cabnetService.selectedTabIndex()}
	get tabOptions() {return this.cabnetService.tabOptions()}
	tabEntries = computed(() => {return this.tabOptions.map((v,i) => this.cabnetService.TABS[v])})


	onTabClick(tabIndex: number) {
		if (this.cabnetService.selectedTabIndex() === tabIndex && this.cabnetService.isOpen()) {
			this.cabnetService.closeCabnet();
		} else {
			this.cabnetService.openCabnet(tabIndex);
			console.log(MIDI_DRUM_MAPPING)
		}
	}
}
