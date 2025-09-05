import { CommonModule } from "@angular/common";
import { TrackType, MidiTrackType, AudioTrackType, Track } from "@shared/types";
import { ChangeDetectionStrategy, Component, computed, Injector, runInInjectionContext } from "@angular/core";
import { CabnetService, MidiTabs } from "../../services/cabnet.service";

import { MatDivider } from "@angular/material/divider";
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MidiEditorComponent } from "./midi-editor/midi-editor.component";


@Component({
	selector: 'app-studio-cabnet',
	imports: [CommonModule, MatDivider, MatButtonModule, MatButtonToggleModule, MidiEditorComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="cabnet-container" [style.height.px]="cabnetService.isOpen() ? openHeight : closedHeight">
			<ng-container *ngIf="selectedTab == MidiTabs['MIDI Editor']">
				<midi-editor></midi-editor>
			</ng-container>

			<div class="tabs-row">
				<mat-button-toggle-group class='btn-group'>
					<ng-container *ngFor="let tab of tabEntries(); let i = index">
						<button 
							class="btn"
							[class.selected]="selectedTab === i"
							(click)="onTabClick(i)">
							{{ tab.value }}
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
	
	MidiTabs = MidiTabs;

	constructor (
		injector: Injector,
		public cabnetService: CabnetService,
	) {}

	openHeight = 400;
	closedHeight = 40;

	get selectedTab() {return this.cabnetService.selectedTab()}

	get tabOptions() {return this.cabnetService.tabOptions()}
	get tabEntries() {return () => Object.keys(this.tabOptions)
			.filter(key => isNaN(Number(key)))
			.map((key, index) => ({ 
				key, 
				value: key,
				index 
			}))}


	onTabClick(tabIndex: number) {
		if (this.cabnetService.selectedTab() === tabIndex && this.cabnetService.isOpen()) {
			this.cabnetService.closeCabnet();
		} else {
			this.cabnetService.openCabnet(tabIndex);
		}
	}
}
