import { Injectable } from "@angular/core";
import { AudioCacheService, WaveformData } from "./audio-cache.service";
import { MidiNote } from "@shared/types";
import { ViewportService } from "./viewport.service";


interface MidiRenderOptions {
	noteHeight: number;
	minPitch: number;
	maxPitch: number;
	noteColors: {
		fill: string;
		stroke: string;
	};
}

const DEFAULT_RENDER_OPTIONS: MidiRenderOptions = {
	noteHeight: 2,
	minPitch: 21, // A0
	maxPitch: 108, // C8
	noteColors: {
		fill: 'rgba(255, 255, 255, 0.8)',
		stroke: 'rgba(255, 255, 255, 1)'
	}
};

@Injectable()
export class RenderMidiService {
	private static _instance: RenderMidiService;
	static get instance(): RenderMidiService { return RenderMidiService._instance; }

	constructor() {
		RenderMidiService._instance = this;
	}

	// ==========================================
	// PUBLIC API METHODS
	// ==========================================

	async createMidiViewport(
		canvas: HTMLCanvasElement,
		midiNotes: MidiNote[],
		startPx: number,
		endPx: number,
		options?: Partial<MidiRenderOptions>
	) {
		const ctx = this.setupCanvas(canvas, endPx-startPx);
		const dpr = window.devicePixelRatio || 1;
		const heightPx = canvas.height / dpr;
		
		if (!midiNotes || midiNotes.length === 0) {
			return;
		}

		const pitchRange = this.calculatePitchRange(midiNotes);

		const finalOptions = {...DEFAULT_RENDER_OPTIONS, ...options};
		midiNotes.forEach(note => {
			this.renderMidiNote(
				ctx, 
				note, 
				pitchRange, 
				startPx,
				canvas.width, 
				heightPx,
				{...DEFAULT_RENDER_OPTIONS, ...finalOptions}
			);
		});
	}

	// ==========================================
	// PRIVATE RENDERING METHODS
	// ==========================================

	private setupCanvas(canvas: HTMLCanvasElement, newWidth?: number): CanvasRenderingContext2D {
		const ctx = canvas.getContext('2d')!;
		const dpr = window.devicePixelRatio || 1;

		const width = canvas.clientWidth;
		const height = canvas.clientHeight;

		ctx.clearRect(0, 0, width, height);

		// Use provided dimensions or canvas client dimensions
		const displayWidth = newWidth ?? canvas.clientWidth;
		const displayHeight = height ?? canvas.clientHeight;

		// Set actual canvas size in memory (high DPI)
		canvas.width = displayWidth * dpr;
		canvas.height = displayHeight * dpr;

		// Scale canvas back down using CSS
		canvas.style.width = displayWidth + 'px';
		canvas.style.height = displayHeight + 'px';

		// Scale drawing operations for high DPI
		ctx.scale(dpr, dpr);

		return ctx;
	}

	private calculatePitchRange(midiNotes: MidiNote[]): { min: number; max: number } {
		if (midiNotes.length === 0) {
			return { min: 60, max: 72 }; 
		}

		let minPitch = Math.min(...midiNotes.map(note => note.pitch));
		let maxPitch = Math.max(...midiNotes.map(note => note.pitch));

		const padding = Math.max(1, (maxPitch - minPitch) * 0.1);
		minPitch = Math.max(21, minPitch - padding); // A0
		maxPitch = Math.min(108, maxPitch + padding); // C8
		
		return { min: minPitch, max: maxPitch };
	}
	
	private renderMidiNote(
		ctx: CanvasRenderingContext2D,
		note: MidiNote,
		pitchRange: { min: number; max: number },
		regionStartPx: number,
		canvasWidth: number,
		canvasHeight: number,
		options: MidiRenderOptions,
	): void {
		const noteStart = ViewportService.instance.posToPx(note.start) - regionStartPx;
		const noteEnd = noteStart + ViewportService.instance.posToPx(note.duration);

		const noteWidthPx = Math.max(1, noteEnd - noteStart);

		// Calculate vertical position based on pitch
		const pitchNormalized = (note.pitch - pitchRange.min) / (pitchRange.max - pitchRange.min);
		const noteY = canvasHeight - (pitchNormalized * canvasHeight);
		const noteHeight = Math.max(1, Math.min(options.noteHeight, canvasHeight / (pitchRange.max - pitchRange.min + 1)));

		// Apply velocity to opacity/brightness
		const velocityNormalized = note.velocity / 127;
		const alpha = Math.max(0.3, velocityNormalized);
		
		ctx.save();
		ctx.globalAlpha = alpha;
		
		ctx.fillRect(noteStart, noteY - noteHeight / 2, noteWidthPx, noteHeight);

		if (noteWidthPx > 2) {
			ctx.strokeRect(noteStart, noteY - noteHeight / 2, noteWidthPx, noteHeight);
		}
		
		ctx.restore();
	}
}