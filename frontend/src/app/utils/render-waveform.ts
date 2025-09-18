import { WaveformData } from "@shared/types";

export interface WaveformRenderOptions {
	barWidth: number;
	barSpacing: number;
	color: string;
	backgroundColor: string;
	centerLine: boolean;
	amplitude: number;
}

const DEFAULT_RENDER_OPTIONS: WaveformRenderOptions = {
	barWidth: 4,
	barSpacing: 0,
	color: '#303031ff',
	backgroundColor: 'transparent',
	centerLine: false,
	amplitude: 0.9,
}

export async function createWaveformViewport(
	waveformData: WaveformData,
	canvas: HTMLCanvasElement,
	audioStart: number,
	audioEnd: number,
	startPx: number,
	endPx: number,
	options?: Partial<WaveformRenderOptions>
) {
	const startTime = performance.now();
	const floatPeaks = new Float32Array(Object.values(waveformData.peaks));
	waveformData = {...waveformData, peaks: floatPeaks};
	
	try {
		if (!waveformData) {
			console.error('Waveform data not found');
			return { success: false, error: 'Waveform data not found', renderedSamples: 0, renderTime: 0 };
		}

		const ctx = setupCanvas(canvas, endPx-startPx);
		const dpr = window.devicePixelRatio || 1;
		const heightPx = canvas.height / dpr;
		const audioSegment = extractWaveformSegment(waveformData, audioStart, audioEnd);

		const finalOptions = {...DEFAULT_RENDER_OPTIONS, ...options};
		const renderedSamples = drawWaveformViewport(
			ctx, 
			audioSegment, 
			heightPx,
			startPx,
			endPx,
			{...DEFAULT_RENDER_OPTIONS, ...finalOptions}
		);

		const renderTime = performance.now() - startTime;

		return {
			success: true,
			renderedSamples,
			renderTime
		};

	} catch (error) {
		console.error('Viewport render error:', error);
		const renderTime = performance.now() - startTime;
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown viewport rendering error',
			renderedSamples: 0,
			renderTime
		};
	}
}

// ==========================================
// PRIVATE RENDERING METHODS
// ==========================================

function setupCanvas(canvas: HTMLCanvasElement, newWidth?: number): CanvasRenderingContext2D {
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

function extractWaveformSegment(
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

function drawWaveformViewport(
	ctx: CanvasRenderingContext2D,
	peaks: Float32Array,
	canvasHeight: number,
	startPx: number,
	endPx: number,
	options: WaveformRenderOptions,
): void {
	// Default options
	const barWidth = options.barWidth;
	const barSpacing = options.barSpacing;
	const color = options.color;
	const backgroundColor = options.backgroundColor;
	const centerLine = options.centerLine;
	const amplitude = options.amplitude;

	// Calculate viewport dimensions
	const viewportWidth = endPx - startPx;
	const barStep = barWidth + barSpacing;
	const maxBars = Math.floor(viewportWidth / barStep);
	
	// Clear background if specified
	if (backgroundColor !== 'transparent') {
		ctx.fillStyle = backgroundColor;
		ctx.fillRect(startPx, 0, viewportWidth, canvasHeight);
	}
	
	// Set drawing style
	ctx.fillStyle = color;
	ctx.strokeStyle = color;
	
	// Calculate center line
	const centerY = canvasHeight / 2;
	
	// Draw center line if enabled
	if (centerLine) {
		ctx.strokeStyle = color;
		ctx.globalAlpha = 0.3;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(startPx, centerY);
		ctx.lineTo(endPx, centerY);
		ctx.stroke();
		ctx.globalAlpha = 1.0;
	}
	
	// Calculate how to map peaks array to available bars
	const peaksLength = peaks.length;
	
	if (peaksLength === 0) return;
	
	// Determine how many bars we'll actually render
	const barsToRender = Math.min(maxBars, peaksLength);
	
	// Calculate the actual spacing between bars based on available peaks
	// This ensures even distribution across the viewport
	const actualBarStep = barsToRender > 1 ? viewportWidth / barsToRender : viewportWidth;
	
	if (peaksLength <= maxBars) {
		// We have fewer or equal peaks than available bar slots
		// Distribute peaks evenly across the viewport
		for (let i = 0; i < peaksLength; i++) {
			// Use actualBarStep for even distribution instead of fixed barStep
			const x = 0*startPx + (i * actualBarStep);
			
			// Make sure we don't exceed viewport bounds
			if (x + barWidth > endPx) break;
			
			// Get peak value (assuming peaks are normalized between -1 and 1)
			let peakValue = peaks[i] * amplitude;
			
			// Clamp peak value to prevent overflow
			peakValue = Math.max(-1, Math.min(1, peakValue));
			
			// Calculate bar height (use absolute value for symmetric bars)
			const barHeight = Math.abs(peakValue) * (canvasHeight / 2);
			
			// Draw symmetric bar from center
			const barTop = centerY - barHeight;
			const barBottom = centerY + barHeight;
			const totalBarHeight = barBottom - barTop;
			
			// Draw the bar
			if (totalBarHeight > 0) {
				ctx.fillRect(x, barTop, barWidth, totalBarHeight);
			} else {
				// Draw minimum height bar at center for zero/near-zero values
				ctx.fillRect(x, centerY - 0.5, barWidth, 1);
			}
		}
	} else {
		// We have more peaks than available bar slots
		// Sample or average peaks to fit the available bars
		for (let i = 0; i < maxBars; i++) {
			const x = 0*startPx + (i * barStep); // Use original barStep when downsampling
			
			// Calculate which peak(s) this bar represents
			const peakStart = (i / maxBars) * peaksLength;
			const peakEnd = ((i + 1) / maxBars) * peaksLength;
			const startIdx = Math.floor(peakStart);
			const endIdx = Math.min(Math.ceil(peakEnd), peaksLength - 1);
			
			// Find the maximum absolute value in this range for better visual representation
			let maxPeakValue = 0;
			for (let j = startIdx; j <= endIdx; j++) {
				const absValue = Math.abs(peaks[j]);
				if (absValue > Math.abs(maxPeakValue)) {
					maxPeakValue = peaks[j]; // Keep the sign of the peak with maximum absolute value
				}
			}
			
			// Apply amplitude scaling and clamping
			let peakValue = maxPeakValue * amplitude;
			peakValue = Math.max(-1, Math.min(1, peakValue));
			
			// Calculate and draw bar
			const barHeight = Math.abs(peakValue) * (canvasHeight / 2);
			const barTop = centerY - barHeight;
			const barBottom = centerY + barHeight;
			const totalBarHeight = barBottom - barTop;
			
			if (totalBarHeight > 0) {
				ctx.fillRect(x, barTop, barWidth, totalBarHeight);
			} else {
				ctx.fillRect(x, centerY - 0.5, barWidth, 1);
			}
		}
	}
}