import { Injectable } from "@angular/core";
import { AudioCacheService, WaveformData } from "./audio-cache.service";

export interface WaveformRenderOptions {
	waveColor: string;
	progressColor: string;
	backgroundColor: string;
	barWidth: number;
	barRadius: number;
	barGap: number;
	centerLine?: boolean;
	normalize?: boolean;
}

export interface RenderRequest {
	fileId: string;
	audioStartOffset: number; // seconds
	audioEndOffset: number;	 // seconds
	canvas: HTMLCanvasElement;
	options: WaveformRenderOptions;
	viewport?: {
		startTime: number;
		endTime: number;
		pixelsPerSecond: number;
	};
}

export interface RenderResult {
	success: boolean;
	error?: string;
	renderedSamples: number;
	renderTime: number;
}


@Injectable()
export class WaveformRenderService {
	private static _instance: WaveformRenderService;
	static get instance(): WaveformRenderService { return WaveformRenderService._instance; }

	private defaultOptions: WaveformRenderOptions = {
		waveColor: '#2c2d2eff',
		progressColor: '#b1b1b1ff',
		backgroundColor: 'transparent',
		barWidth: 2,
		barRadius: 0,
		barGap: 0,
		centerLine: false,
		normalize: true
	};

	private renderQueue = new Map<string, Promise<RenderResult>>();

	constructor(
		private audioCacheService: AudioCacheService,
	) {
		WaveformRenderService._instance = this;
	}

	// ==========================================
	// PUBLIC API METHODS
	// ==========================================

	async renderWaveform(request: RenderRequest): Promise<RenderResult> {
		const startTime = performance.now();
		const requestId = this.generateRequestId(request);

		// Avoid duplicate renders for the same request
		if (this.renderQueue.has(requestId)) {
			return this.renderQueue.get(requestId)!;
		}

		const renderPromise = this.executeRender(request, startTime);
		this.renderQueue.set(requestId, renderPromise);

		try {
			const result = await renderPromise;
			return result;
		} finally {
			// Cleanup after render completes
			setTimeout(() => this.renderQueue.delete(requestId), 100);
		}
	}

	async renderSimple(
		fileId: string,
		canvas: HTMLCanvasElement,
		startOffset: number = 0,
		endOffset?: number
	): Promise<RenderResult> {
		const waveformData = this.audioCacheService.getWaveformData(fileId);
		if (!waveformData) {
			return { success: false, error: 'Waveform data not found', renderedSamples: 0, renderTime: 0 };
		}

		const request: RenderRequest = {
			fileId,
			audioStartOffset: startOffset,
			audioEndOffset: endOffset ?? waveformData.duration,
			canvas,
			options: { ...this.defaultOptions }
		};

		return this.renderWaveform(request);
	}

	getDuration(fileId: string): number | null {
		const data = this.audioCacheService.getWaveformData(fileId);
		return data?.duration ?? null;
	}

	setupCanvas(canvas: HTMLCanvasElement, width?: number, height?: number): CanvasRenderingContext2D {
		const ctx = canvas.getContext('2d')!;
		const dpr = window.devicePixelRatio || 1;

		// Use provided dimensions or canvas client dimensions
		const displayWidth = width ?? canvas.clientWidth;
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

	// ==========================================
	// PRIVATE RENDERING METHODS
	// ==========================================

	private async executeRender(request: RenderRequest, startTime: number): Promise<RenderResult> {
		try {
			const validation = this.validateRequest(request);
			if (!validation.valid) {
				return { success: false, error: validation.error!, renderedSamples: 0, renderTime: 0 };
			}

			let waveformData = this.audioCacheService.getWaveformData(request.fileId);
			if (waveformData == null) {
				return { success: false, error: validation.error!, renderedSamples: 0, renderTime: 0 };
			}

			// Setup canvas
			const ctx = this.setupCanvas(request.canvas);

			// Extract the segment we need to render
			const segment = this.extractWaveformSegment(
				waveformData,
				request.audioStartOffset,
				request.audioEndOffset
			);

			// Apply viewport filtering if provided
			const visibleSegment = request.viewport
				? this.applyViewport(segment, request)
				: segment;

			// Clear canvas
			this.clearCanvas(ctx, request.canvas, request.options);

			// Render the waveform
			const renderedSamples = this.drawWaveform(ctx, visibleSegment, request);

			const renderTime = performance.now() - startTime;

			return {
				success: true,
				renderedSamples,
				renderTime
			};

		} catch (error) {
			console.error(error);
			const renderTime = performance.now() - startTime;
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown rendering error',
				renderedSamples: 0,
				renderTime
			};
		}
	}

	private validateRequest(request: RenderRequest): { valid: boolean; error?: string } {
		if (!request.fileId) {
			return { valid: false, error: 'fileId is required' };
		}

		if (!request.canvas) {
			return { valid: false, error: 'canvas is required' };
		}

		if (request.audioStartOffset < 0) {
			return { valid: false, error: 'audioStartOffset must be >= 0' };
		}

		if (request.audioEndOffset < request.audioStartOffset) {
			return { valid: false, error: 'audioEndOffset must be > audioStartOffset' };
		}

		return { valid: true };
	}

	private extractWaveformSegment(
		waveformData: WaveformData,
		startTime: number,
		endTime: number
	): Float32Array {
		const totalSamples = waveformData.peaks.length;
		const samplesPerSecond = totalSamples / waveformData.duration;

		const startSample = Math.floor(startTime * samplesPerSecond);
		const endSample = Math.min(Math.ceil(endTime * samplesPerSecond), totalSamples);

		return waveformData.peaks.slice(startSample, endSample);
	}

	private applyViewport(segment: Float32Array, request: RenderRequest): Float32Array {
		const viewport = request.viewport!;
		const segmentDuration = request.audioEndOffset - request.audioStartOffset;
		const samplesPerSecond = segment.length / segmentDuration;

		// Calculate what part of the segment is visible in viewport
		const viewportStart = Math.max(viewport.startTime, request.audioStartOffset);
		const viewportEnd = Math.min(viewport.endTime, request.audioEndOffset);

		if (viewportStart >= viewportEnd) {
			return new Float32Array(0); // Nothing visible
		}

		// Convert to sample indices within the segment
		const relativeStart = viewportStart - request.audioStartOffset;
		const relativeEnd = viewportEnd - request.audioStartOffset;

		const startSample = Math.floor(relativeStart * samplesPerSecond);
		const endSample = Math.min(Math.ceil(relativeEnd * samplesPerSecond), segment.length);

		return segment.slice(startSample, endSample);
	}

	private clearCanvas(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, options: WaveformRenderOptions): void {
		const width = canvas.clientWidth;
		const height = canvas.clientHeight;

		if (options.backgroundColor && options.backgroundColor !== 'transparent') {
			ctx.fillStyle = options.backgroundColor;
			ctx.fillRect(0, 0, width, height);
		} else {
			ctx.clearRect(0, 0, width, height);
		}
	}

	private drawWaveform(
		ctx: CanvasRenderingContext2D,
		peaks: Float32Array,
		request: RenderRequest
	): number {
		if (peaks.length === 0) return 0;

		const canvas = request.canvas;
		const options = request.options;
		const width = canvas.clientWidth;
		const height = canvas.clientHeight;
		const centerY = height / 2;

		// Calculate bar dimensions
		const totalBarWidth = options.barWidth + options.barGap;
		const barsToRender = Math.floor(width / totalBarWidth);
		const samplesPerBar = Math.max(1, Math.floor(peaks.length / barsToRender));

		// Normalize peaks if requested
		const normalizedPeaks = options.normalize ? this.normalizePeaks(peaks) : peaks;

		// Set drawing style
		ctx.fillStyle = options.waveColor;

		let renderedSamples = 0;

		// Draw bars
		for (let i = 0; i < barsToRender; i++) {
			const x = i * totalBarWidth;
			
			// Calculate peak value for this bar (average multiple samples if needed)
			let peakValue = 0;
			const startSample = i * samplesPerBar;
			const endSample = Math.min(startSample + samplesPerBar, normalizedPeaks.length);
			
			for (let j = startSample; j < endSample; j++) {
				peakValue = Math.max(peakValue, Math.abs(normalizedPeaks[j]));
			}

			const barHeight = peakValue * height * 0.9; // Use 90% of available height
			const y = centerY - (barHeight / 2);

			// Draw rounded rectangle
			if (options.barRadius > 0) {
				this.drawRoundedRect(ctx, x, y, options.barWidth, barHeight, options.barRadius);
			} else {
				ctx.fillRect(x, y, options.barWidth, barHeight);
			}

			renderedSamples += (endSample - startSample);
		}

		// Draw center line if requested
		if (options.centerLine) {
			this.drawCenterLine(ctx, width, centerY);
		}

		return renderedSamples;
	}

	private normalizePeaks(peaks: Float32Array): Float32Array {
		let maxPeak = 0;
		for (let i = 0; i < peaks.length; i++) {
			maxPeak = Math.max(maxPeak, Math.abs(peaks[i]));
		}

		if (maxPeak === 0) return peaks;

		const normalized = new Float32Array(peaks.length);
		for (let i = 0; i < peaks.length; i++) {
			normalized[i] = peaks[i] / maxPeak;
		}

		return normalized;
	}

	private drawRoundedRect(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		width: number,
		height: number,
		radius: number
	): void {
		ctx.beginPath();
		ctx.roundRect(x, y, width, height, radius);
		ctx.fill();
	}

	private drawCenterLine(ctx: CanvasRenderingContext2D, width: number, y: number): void {
		ctx.strokeStyle = '#666666';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.lineTo(width, y);
		ctx.stroke();
	}

	private generateRequestId(request: RenderRequest): string {
		return [
			request.fileId,
			request.audioStartOffset.toFixed(2),
			request.audioEndOffset.toFixed(2),
			request.canvas.width,
			request.canvas.height,
			JSON.stringify(request.options)
		].join('|');
	}
}