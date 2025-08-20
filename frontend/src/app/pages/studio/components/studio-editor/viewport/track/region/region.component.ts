import { ChangeDetectionStrategy, Component, computed, ElementRef, Input, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Region, Track } from '@shared/types';

import { ProjectState } from '@src/app/pages/studio/services/project-state.service';
import { SelectionService } from '@src/app/pages/studio/services/selection.service';
import { ViewportService } from '@src/app/pages/studio/services/viewport.service';

@Component({
	selector: 'viewport-track-region',
	imports: [CommonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="region"
			[style.--colorBase]="color()"
			
			[style.border-color]="isSelected() ? 'white' : 'black'"

			[style.width]="width()"
			[style.left]="startPos()"
			(click)="select()"
			>
			{{ isSelected()}}
		</div>
	`,
	styleUrl: './region.component.scss'
})

export class RegionComponent {
	@Input() track!: Track;
	@Input() trackIndex!: number;
	@Input() region!: Region;
	@Input() regionIndex!: number;

	constructor (
		public projectState : ProjectState,
		public trackSelectService : SelectionService,
		public viewportService: ViewportService,
	) {}

	width = computed(() => `${this.region.duration * this.viewportService.measureWidth()}px`);
	startPos = computed(() => `${this.region.start * this.viewportService.measureWidth()}px`);

	color = computed(() => this.track.color);
	colorRegionBg = computed(() => {
		const hex = this.color();
		const hsl = hexToHsl(hex);

		return hslToCss(
			hsl.h, 
			Math.max(0, hsl.s - 20), 
			Math.max(0, hsl.l - 20));
	});
	colorRegionBgSelected = computed(() => {
		const hex = this.color();
		const hsl = hexToHsl(hex);

		return hslToCss(
			hsl.h, 
			Math.max(0, hsl.s - 20), 
			Math.max(0, hsl.l));
	});

	isSelected = computed(() => 
		this.trackSelectService.selectedTrack() == this.trackIndex && 
		this.trackSelectService.selectedRegion() == this.regionIndex
	);
	select() { this.trackSelectService.setSelectedTrack(this.trackIndex); this.trackSelectService.setSelectedRegion(this.regionIndex)}
}

// COLOR HELPERS

function hexToHsl(hex: string): { h: number; s: number; l: number } {
	hex = hex.replace('#', '');
	const bigint = parseInt(hex.substring(0, 6), 16);
	const r = (bigint >> 16) & 255;
	const g = (bigint >> 8) & 255;
	const b = bigint & 255;

	const rNorm = r / 255;
	const gNorm = g / 255;
	const bNorm = b / 255;

	const max = Math.max(rNorm, gNorm, bNorm);
	const min = Math.min(rNorm, gNorm, bNorm);
	let h = 0, s = 0;
	let l = (max + min) / 2;

	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
			case gNorm: h = (bNorm - rNorm) / d + 2; break;
			case bNorm: h = (rNorm - gNorm) / d + 4; break;
		}
		h /= 6;
  	}	

  	return { h: h * 360, s: s * 100, l: l * 100 };
}
function hslToCss(h: number, s: number, l: number): string {
  	return `hsl(${h}, ${s}%, ${l}%)`;
}
