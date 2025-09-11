import { Injectable } from '@angular/core';
import { AudioCacheService } from './audio-cache.service';
import { ViewportService } from './viewport.service';
import { ReverbProcessor } from '@shared/audio-processing/synthesis/effects/reverb-handler';
import { AudioRegion, MidiRegion, MidiTrackType, RegionType, Track } from '@shared/types';
import { ObjectStateNode } from '../state/state.factory';
import { TracksService } from './tracks.service';
import { StateService } from '../state/state.service';
import { TimelinePlaybackService } from './timeline-playback.service';

import 'lamejs/lame.min.js';
import { SynthesizerService } from './synthesizer.service';
declare const lamejs: any;

@Injectable()
export class TimelineExportService {
	constructor() {
		this.reverbProcessor = new ReverbProcessor();
	}

	declare reverbProcessor: ReverbProcessor
	get tracks() { return TracksService.instance.tracks()}
	get totalDuration() { return StateService.instance.projectDuration()}

	// =====================================================================================
	// Encodings

	async exportProjectAsMP3(): Promise<Blob> {
		const renderedBuffer = await this.renderTimeline();
		return this.wavToMp3(this.encodeAsWAV(renderedBuffer))
	}
	async exportProjectAsWAV(): Promise<Blob> {
		const renderedBuffer = await this.renderTimeline();
		return this.encodeAsWAV(renderedBuffer);
	}

	private encodeAsWAV(audioBuffer: AudioBuffer): Blob {
		console.log("encoding", audioBuffer, audioBuffer.length, audioBuffer.duration)
		const length = audioBuffer.length;
		const numberOfChannels = audioBuffer.numberOfChannels;
		const sampleRate = audioBuffer.sampleRate;
		const bytesPerSample = 2;
		const blockAlign = numberOfChannels * bytesPerSample;
		const byteRate = sampleRate * blockAlign;
		const dataSize = length * blockAlign;
		const bufferSize = 44 + dataSize;

		const arrayBuffer = new ArrayBuffer(bufferSize);
		const view = new DataView(arrayBuffer);

		// WAV header
		const writeString = (offset: number, string: string) => {
			for (let i = 0; i < string.length; i++) {
				view.setUint8(offset + i, string.charCodeAt(i));
			}
		};

		writeString(0, 'RIFF');
		view.setUint32(4, bufferSize - 8, true);
		writeString(8, 'WAVE');
		writeString(12, 'fmt ');
		view.setUint32(16, 16, true);
		view.setUint16(20, 1, true);
		view.setUint16(22, numberOfChannels, true);
		view.setUint32(24, sampleRate, true);
		view.setUint32(28, byteRate, true);
		view.setUint16(32, blockAlign, true);
		view.setUint16(34, bytesPerSample * 8, true);
		writeString(36, 'data');
		view.setUint32(40, dataSize, true);

		// Convert float32 to int16 and write to buffer
		let offset = 44;
		for (let i = 0; i < length; i++) {
			for (let channel = 0; channel < numberOfChannels; channel++) {
				const sample = audioBuffer.getChannelData(channel)[i];
				const intSample = Math.max(-1, Math.min(1, sample));
				view.setInt16(offset, intSample < 0 ? intSample * 0x8000 : intSample * 0x7FFF, true);
				offset += 2;
			}
		}

		return new Blob([arrayBuffer], { type: 'audio/wav' });
	}

	async wavToMp3(wavBlob: Blob): Promise<Blob> {
		// Step 1: Read WAV file into ArrayBuffer
		const arrayBuffer = await wavBlob.arrayBuffer();
		const dataView = new DataView(arrayBuffer);

		// Step 2: Parse WAV header
		const numChannels = dataView.getUint16(22, true);
		const sampleRate = dataView.getUint32(24, true);
		const bitsPerSample = dataView.getUint16(34, true);

		if (bitsPerSample !== 16) {
			throw new Error('Only 16-bit WAV files are supported');
		}

		const dataSize = dataView.getUint32(40, true);
		const samples = new Int16Array(dataSize / 2);

		// Step 3: Extract PCM samples
		let offset = 44; // WAV header is 44 bytes
		for (let i = 0; i < samples.length; i++) {
			samples[i] = dataView.getInt16(offset, true);
			offset += 2;
		}

		// Step 4: Split channels if stereo
		let left: Int16Array;
		let right: Int16Array;

		if (numChannels === 2) {
			left = new Int16Array(samples.length / 2);
			right = new Int16Array(samples.length / 2);
			for (let i = 0, j = 0; i < samples.length; i += 2, j++) {
				left[j] = samples[i];
				right[j] = samples[i + 1];
			}
		} else {
			left = samples;
			right = samples; // Mono
		}

		// Step 5: Encode to MP3
		const mp3Encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, 128); // 128 kbps
		const blockSize = 1152;
		const mp3Data: Uint8Array[] = [];

		for (let i = 0; i < left.length; i += blockSize) {
			const leftChunk = left.subarray(i, i + blockSize);
			const rightChunk = right.subarray(i, i + blockSize);
			const mp3buf = mp3Encoder.encodeBuffer(leftChunk, numChannels === 2 ? rightChunk : undefined);
			if (mp3buf.length > 0) mp3Data.push(mp3buf);
		}

		const flush = mp3Encoder.flush();
		if (flush.length > 0) mp3Data.push(flush);

		// Step 6: Return MP3 Blob
		return new Blob(mp3Data as BlobPart[], { type: 'audio/mpeg' });
	}

	// =====================================================================================
	// Render

	private async renderTimeline(): Promise<AudioBuffer> {
		const totalDuration = this.totalDuration;
		const tracks = this.tracks;

		const sampleRate = TimelinePlaybackService.instance.audioContext.sampleRate;
		const totalSamples = Math.ceil(totalDuration * sampleRate);

		// Create offline context for rendering
		const offlineContext = new OfflineAudioContext(2, totalSamples, sampleRate);
		
		// Create master gain node for offline context
		const masterGainNode = offlineContext.createGain();
		masterGainNode.connect(offlineContext.destination);

		// Render all tracks (using your playback logic)
		await this.renderAllTracks(offlineContext, tracks, masterGainNode);

		return await offlineContext.startRendering();
	}

	private async renderAllTracks(
		offlineContext: OfflineAudioContext,
		tracks: ObjectStateNode<Track>[],
		masterGainNode: GainNode
	): Promise<void> {
		
		for (const track of tracks) {
			const trackId = track._id;
			const volume = track.volume();
			const pan = track.pan();
			const reverb = track.reverb();
			const mute = track.mute();

			// Create track nodes (same as your playback logic)
			const trackGainNode = offlineContext.createGain();
			const trackPannerNode = offlineContext.createStereoPanner();
			
			// Create reverb mix node if reverb is enabled
			const reverbMixNode = reverb > 0 ? 
				await this.createOfflineReverbMixNode(offlineContext, reverb) : null;
			
			const volumeLevel = mute ? 0 : volume / 100;
			trackGainNode.gain.value = volumeLevel;
			trackPannerNode.pan.value = pan / 100;
			
			// Connect audio chain: gain -> reverb -> panner -> master
			if (reverbMixNode) {
				trackGainNode.connect(reverbMixNode.input);
				reverbMixNode.output.connect(trackPannerNode);
			} else {
				trackGainNode.connect(trackPannerNode);
			}
			
			trackPannerNode.connect(masterGainNode);

			// Process all regions for this track
			for (const region of track.regions()) {
				if (region.type() === RegionType.Audio) {
					await this.renderAudioRegion(
						offlineContext,
						region as ObjectStateNode<AudioRegion>, 
						trackGainNode
					);
				} else if (region.type() === RegionType.Midi) {
					await this.renderMidiRegion(
						offlineContext,
						region as ObjectStateNode<MidiRegion>, 
						trackGainNode,
						trackId
					);
				}
			}
		}
	}

	private async renderAudioRegion(
		offlineContext: OfflineAudioContext,
		audioRegion: ObjectStateNode<AudioRegion>, 
		trackGainNode: GainNode
	): Promise<void> {
		const audioBuffer = AudioCacheService.instance.getAudioBuffer(audioRegion.fileId());
		if (!audioBuffer) return;

		const source = offlineContext.createBufferSource();
		source.buffer = audioBuffer;
		source.connect(trackGainNode);

		// Calculate timing (same logic as your playback)
		const regionStart = ViewportService.instance.posToTime(audioRegion.start());
		const audioStart = audioRegion.audioStartOffset();
		const audioEnd = audioRegion.audioEndOffset();
		const duration = audioEnd - audioStart;

		// For offline rendering, schedule everything from timeline position 0
		source.start(regionStart, audioStart, duration);
	}

	private async renderMidiRegion(
		offlineContext: OfflineAudioContext,
		midiRegion: ObjectStateNode<MidiRegion>, 
		trackGainNode: GainNode,
		trackId: string
	): Promise<void> {
		const midiData = midiRegion.midiData.snapshot();
		if (!midiData || midiData.length === 0) return;

		const regionStart = ViewportService.instance.posToTime(midiRegion.start());
		const regionDuration = ViewportService.instance.posToTime(midiRegion.duration());

		// Check if this track is a drum track (same logic as playback)
		const track = TracksService.instance.getTrack(trackId);

		// Create MIDI source for offline context
		const midiSource = await SynthesizerService.instance.createMidiSource(midiData, regionStart, regionDuration, trackId, track!.trackType() as MidiTrackType, true, offlineContext);
		midiSource.connect(trackGainNode);
		
		// Schedule from the region start time
		midiSource.start(regionStart, 0, regionDuration);
	}

	private createOfflineReverbMixNode(
		offlineContext: OfflineAudioContext, 
		reverbAmount: number
	) {
		return this.reverbProcessor.createReverbMixNode(reverbAmount, true, offlineContext);
	}
}