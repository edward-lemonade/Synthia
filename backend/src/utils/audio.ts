import { WaveformData } from "@shared/types";
import * as wav from 'node-wav';

interface WavDecodeResult {
    readonly sampleRate: number;
    readonly channelData: readonly Float32Array<ArrayBufferLike>[];
}

function createAudioBuffer(wavResult: WavDecodeResult): AudioBuffer {
	return {
		sampleRate: wavResult.sampleRate,
		length: wavResult.channelData[0].length,
		duration: wavResult.channelData[0].length / wavResult.sampleRate,
		numberOfChannels: wavResult.channelData.length,
		getChannelData: (channel: number) => wavResult.channelData[channel],
		copyFromChannel: (destination: Float32Array, channelNumber: number, bufferOffset = 0) => {
			const source = wavResult.channelData[channelNumber];
			destination.set(source.subarray(bufferOffset, bufferOffset + destination.length));
		},
		copyToChannel: (source: Float32Array, channelNumber: number, bufferOffset = 0) => {
			wavResult.channelData[channelNumber].set(source, bufferOffset);
		}
	} as AudioBuffer;
}

export async function generateAudioWaveformB(arrayBuffer: ArrayBuffer): Promise<WaveformData> {
	const audioData = await wav.decode(Buffer.from(arrayBuffer)) as WavDecodeResult;
	const decodedBuffer = createAudioBuffer(audioData);

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