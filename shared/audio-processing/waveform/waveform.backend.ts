import { WaveformData } from "../../types";

export async function generateAudioWaveformB(audioBuffer: ArrayBuffer): Promise<WaveformData> {
	const { AudioContext } = await import("isomorphic-web-audio-api");

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
function extractPeaks(audioBuffer: AudioBuffer, targetLength: number): Float32Array {
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