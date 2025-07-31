import { Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatToolbar } from "@angular/material/toolbar";
import { MatSliderModule } from "@angular/material/slider";
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

import { COLORS } from '@theme';
import { Key, KeyListAligned } from 'src/app/lib/music';

type KeyType = 'maj' | 'min';

@Component({
	selector: 'app-studio-toolbar-details',
	imports: [MatToolbar, MatIcon, MatSliderModule, MatMenuModule, MatButtonModule, CommonModule],
	template: `
		<mat-toolbar class='toolbar'>
			<div class='volume'>
				<mat-icon class='volume-icon'>volume_up</mat-icon>
				<mat-slider min="0" max="100" step="1">
					<input matSliderThumb value="100">
				</mat-slider>
			</div>

			<button mat-button [matMenuTriggerFor]="keyMenu" class="key-menu-btn">
				<mat-icon>music_note</mat-icon>
				{{ selectedKey!.display }}
			</button>
			<mat-menu #keyMenu="matMenu" class="key-menu">
				<div class="key-type-toggle">
					<button mat-button class="key-type-btn" [class.selected]="selectedKeyType === 'maj'" (click)="$event.stopPropagation(); setType('maj')">Major</button>
					<button mat-button class="key-type-btn" [class.selected]="selectedKeyType === 'min'" (click)="$event.stopPropagation(); setType('min')">Minor</button>
				</div>
				<div class="key-grid">
					<div class="accidentals-row">
						<span class="key-opt-space-half"></span>
						<ng-container *ngFor="let key of KeyListAligned[selectedKeyType]['acc']; let i = index">
							<ng-container *ngIf="key === null">
								<span class="key-opt-space"></span>
							</ng-container>
							<button *ngIf="key"
								mat-button
								class="key-option"
								[class.selected]="selectedKey!.display === key.display && selectedKeyType === key.type"
								(click)="setSelectedKey(key, 'acc', i); $event.stopPropagation()">
								{{ key.display }}
							</button>
						</ng-container>
					</div>
					<div class="naturals-row">
						<ng-container *ngFor="let key of KeyListAligned[selectedKeyType]['nat']; let i = index">
							<button
								mat-button
								class="key-option"
								[class.selected]="selectedKey!.display === key.display && selectedKeyType === key.type"
								(click)="setSelectedKey(key, 'nat', i); $event.stopPropagation()">
								{{ key.display }}
							</button>
						</ng-container>
					</div>
				</div>
			</mat-menu>
		</mat-toolbar>
	`,
	styles: `
		.toolbar {
			background: ${COLORS.APPBAR_BG_L};
			color: ${COLORS.APPBAR_TEXT};
			height: 60px;
			position: sticky;
			top: 0;
			z-index: 1000;
			width: 100%;
			box-sizing: border-box;
			padding-left: 16px;
			padding-right: 8px;
			align-items: center;
			gap: 20px;
		}

		.volume {
			display: flex;
			align-items: center;
			gap: 8px;
			height: 40px;
			border-radius: 20px;
			padding-left: 12px;
			padding-right: 12px;
			background: ${COLORS.APPBAR_ACCENT_2};
		}
		.volume-icon {
			font-size: 20px;
			width: 20px;
			height: 20px;
		}
		::ng-deep .mat-mdc-slider .mdc-slider__track--active_fill {
			border-color: ${COLORS.ACCENT_YELLOW_L} !important;
			background-color: ${COLORS.ACCENT_YELLOW_L} !important;
		}
		::ng-deep .mat-mdc-slider .mdc-slider__track--inactive {
			background-color: rgba(200, 200, 200, 1) !important;
		}
		::ng-deep .mat-mdc-slider .mdc-slider__thumb-knob {
			background-color: ${COLORS.ACCENT_YELLOW} !important;
			border-color: ${COLORS.ACCENT_YELLOW} !important;
		}
		::ng-deep .mat-mdc-slider .mdc-slider__value-indicator {
			background-color: ${COLORS.ACCENT_YELLOW} !important;
		}


		.key-menu-btn {
			display: flex;
			height: 40px;
			border-radius: 20px;
			background: ${COLORS.APPBAR_ACCENT_2};
			border: none;
			color: ${COLORS.APPBAR_TEXT};
			cursor: pointer;
			transition: background-color 0.2s;

			width: 80px;
			justify-content: left;
		}
		.key-menu-btn .mat-icon {
			flex-shrink: 0;
		}
		.key-menu-btn:hover {
			background: ${COLORS.APPBAR_ACCENT_1};
		}

		::ng-deep .mat-mdc-menu-content {
			padding: 8px !important;
			background: ${COLORS.APPBAR_ACCENT_1} !important;
		}

		.key-type-toggle {
			display: flex;
			gap: 8px;
			margin-bottom: 16px;
		}

		.key-type-toggle button.selected {
			background: ${COLORS.ACCENT_ORANGE};
			color: ${COLORS.APPBAR_BG_L} !important;
		}
		.key-type-btn {
			display: flex;
			align-items: center;
			gap: 4px;
			padding: 8px 12px;
			border: none;
			color: ${COLORS.ACCENT_ORANGE} !important;
			cursor: pointer;
			border-radius: 8px;
			transition: background-color 0.1s;
			background: transparent; 
			box-shadow: 0 0 0 2px ${COLORS.ACCENT_ORANGE} inset; 
		}
		.key-type-btn:hover 	{ 
			background: ${COLORS.ACCENT_ORANGE_L} !important; 
			color: ${COLORS.APPBAR_BG_L} !important;
		}

		.key-grid {
			display: flex;
			flex-direction: column;
			gap: 4px;
		}
		.accidentals-row, .naturals-row {
			display: flex;
			flex-direction: row;
			gap: 4px;
		}
		.key-opt-space {
			width: 32px; 
		}
		.key-opt-space-half {
			width: 15px; /* idk why 16 isnt centered */
		}
		::ng-deep .key-option.mat-mdc-button {
			width: 32px !important;       
			height: 32px !important;
			min-width: 32px !important;      
			min-height: 32px !important;
			max-width: 32px !important;
			max-height: 32px !important;

			padding: 0 !important;    
			display: flex !important;
			align-items: center !important;
			justify-content: center !important;
			box-sizing: border-box !important;

			line-height: 1 !important;
			border: 2px solid ${COLORS.APPBAR_ACCENT_2} !important;
			border-radius: 8px !important;

			background: ${COLORS.APPBAR_ACCENT_1} !important;
			color: ${COLORS.ACCENT_ORANGE} !important;
			border-color: ${COLORS.APPBAR_BG} !important;
		}
		.key-option.selected {
			background: ${COLORS.ACCENT_ORANGE_L} !important;
			color: ${COLORS.APPBAR_BG_L} !important;
			border-color: ${COLORS.ACCENT_ORANGE} !important;
		}
		.key-option:hover {
			background: ${COLORS.APPBAR_ACCENT_2} !important;
			color: ${COLORS.ACCENT_ORANGE} !important;
		}
	`
})
export class StudioToolbarDetailsComponent {
	KeyListAligned = KeyListAligned;

	selectedKeyType: 'maj'|'min' = 'maj';
	selectedKeyRow: 'nat'|'acc' = 'nat'
	selectedKeyIndex = 0;
	selectedKey: Key | null = KeyListAligned[this.selectedKeyType][this.selectedKeyRow][this.selectedKeyIndex]; // default Cmaj

	setSelectedKey(key: Key, row:'nat'|'acc', i: number) {
		this.selectedKeyRow = row;
		this.selectedKeyIndex = i;
		this.selectedKey = key;
	}
	setType(keyType: 'maj'|'min') { 
		this.selectedKeyType = keyType;
		this.selectedKey = KeyListAligned[this.selectedKeyType][this.selectedKeyRow][this.selectedKeyIndex];
	}
}
