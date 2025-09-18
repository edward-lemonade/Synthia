export interface AudioFileData {
	fileId: string;
	buffer64: string;
	mimeType: string;
	waveformData?: WaveformData;
}

export interface WaveformData {
	duration: number;
	sampleRate: number;
	channels: number;
	peaks: Float32Array;
}