import { AudioFileData, generateAudioWaveform, WaveformData } from "@shared/types";
import { Base64 } from "js-base64";

export function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as ArrayBuffer);
		reader.onerror = () => reject(reader.error);
		reader.readAsArrayBuffer(file);
	});
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	return Base64.fromUint8Array(bytes);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const bytes = Base64.toUint8Array(base64);
	return bytes.buffer as ArrayBuffer;
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
	const arrayBuffer = base64ToArrayBuffer(audioFileData.buffer64); // THIS is the bottleneck
	const blob = new Blob([arrayBuffer], { type: audioFileData.mimeType });
	const url = URL.createObjectURL(blob);

	const audioContext = new AudioContext();
	const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice());
	const waveformData = audioFileData.waveformData ?? await generateAudioWaveform(arrayBuffer);

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

