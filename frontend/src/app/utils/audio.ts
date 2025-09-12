import { AudioFileData } from "@shared/types";
import { Base64 } from "js-base64";

export function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as ArrayBuffer);
		reader.onerror = () => reject(reader.error);
		reader.readAsArrayBuffer(file);
	});
}

export function  arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	return Base64.fromUint8Array(bytes);
}

export function  base64ToArrayBuffer(base64: string): ArrayBuffer {
	const bytes = Base64.toUint8Array(base64);
	return bytes.buffer as ArrayBuffer;
}


export interface WaveformData {
	duration: number;
	sampleRate: number;
	channels: number;
	peaks: Float32Array;
}
export interface CachedAudioFile {
	fileId: string;
	arrayBuffer: ArrayBuffer;
	audioBuffer?: AudioBuffer;
	blob: Blob;
	url: string;

	duration: number;
	waveformData: WaveformData;
}
export async function makeCacheAudioFile(audioFileData: AudioFileData) {
	const arrayBuffer = base64ToArrayBuffer(audioFileData.buffer64);
	const blob = new Blob([arrayBuffer], { type: audioFileData.mimeType });
	const url = URL.createObjectURL(blob);

	const audioContext = new AudioContext();
	const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice());
	const waveformData = await generateAudioWaveform(arrayBuffer);

	const cachedFile: CachedAudioFile = {
		fileId: audioFileData.fileId,
		arrayBuffer: arrayBuffer,
		audioBuffer: audioBuffer,
		blob,
		url,
		duration: waveformData.duration,
		waveformData,
	};

	return cachedFile;
}

export async function generateAudioWaveform(audioBuffer: ArrayBuffer): Promise<WaveformData> {
	const audioContext = new AudioContext();
	const decodedBuffer = await audioContext.decodeAudioData(audioBuffer);
	
	// Generate peaks at high resolution (we'll downsample for display)
	const peaks = extractPeaks(decodedBuffer, 8192); // High resolution base
	
	const waveformData: WaveformData = {
		peaks,
		sampleRate: decodedBuffer.sampleRate,
		duration: decodedBuffer.duration,
		channels: decodedBuffer.numberOfChannels
	};

	return waveformData;
}

export function extractPeaks(audioBuffer: AudioBuffer, targetLength: number): Float32Array {
	const channelData = audioBuffer.getChannelData(0); // Use first channel
	const blockSize = Math.floor(channelData.length / targetLength);
	const peaks = new Float32Array(targetLength);

	for (let i = 0; i < targetLength; i++) {
		const start = i * blockSize;
		const end = Math.min(start + blockSize, channelData.length);
		let max = 0;

		for (let j = start; j < end; j++) {
			max = Math.max(max, Math.abs(channelData[j]));
		}
		peaks[i] = max;
	}

	return peaks;
}