import { AudioFileData, AudioRegion, BaseFileRef, MidiNote, MidiRegion, MidiTrackType, ProjectState, RegionType, Track } from "@shared/types/index.js";
import { ReverbProcessor } from "@shared/audio-processing/synthesis/effects/reverb-handler";
import { getAudioFile } from "./../../src/db/s3_client";
import { MidiRenderer } from "@shared/audio-processing/synthesis/midi-renderer";
import WavEncoder from 'wav-encoder';

import { AudioContext, OfflineAudioContext, OscillatorNode, GainNode, BiquadFilterNode } from 'isomorphic-web-audio-api';

export class Renderer {
	declare projectState: ProjectState;

	constructor(projectState: ProjectState) {
		this.projectState = projectState;
		this.reverbProcessor = new ReverbProcessor();
		this.renderer = new MidiRenderer(projectState);

		this.initializationPromise = this.doInitialization(projectState);
	}

	declare reverbProcessor: ReverbProcessor;
	declare audioFiles: Record<string, AudioFileData>;
	declare renderer: MidiRenderer;

	private initializationPromise: Promise<void>;

	private async doInitialization(projectState: ProjectState): Promise<void> {
		const projectId = projectState.metadata.projectId;
		const fileRefs: BaseFileRef[] = projectState.studio.fileRefs;

		let audioFiles: Record<string, AudioFileData> = {};
		const audioDataPromises = fileRefs.map(async (fileRef) => await getAudioFile(projectId, fileRef.fileId));
		const audioDatas: AudioFileData[] = await Promise.all(audioDataPromises);
		audioDatas.forEach((file) => {
			audioFiles[file.fileId] = file;
		});
		
		this.audioFiles = audioFiles;
	}

	get tracks() { return this.projectState.studio.tracks}
	get totalDuration() { 
		return this.projectState.studio.tracks.reduce((max, track) => {
			return Math.max(max, track.regions.reduce((regionMax, region) => {
				return Math.max(regionMax, region.start + region.duration);
			}, 0));
		}, 0) * this.projectState.studio.timeSignature.N  / this.projectState.studio.bpm * 60; 
	}

	// =====================================================================================
	// Encodings

	async exportProjectAsWAV(): Promise<Blob> {
		await this.initializationPromise;
		const renderedBuffer = await this.renderTimeline();
		return await this.encodeAsWAV(renderedBuffer);
	}

	private async encodeAsWAV(audioBuffer: AudioBuffer): Promise<Blob> {
		try {
			// Convert AudioBuffer to the format expected by wav-encoder
			const audioData = {
				sampleRate: audioBuffer.sampleRate,
				channelData: [] as Float32Array[]
			};

			// Extract channel data
			for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
				audioData.channelData.push(audioBuffer.getChannelData(channel));
			}

			// Encode using wav-encoder
			const wavArrayBuffer = await WavEncoder.encode(audioData);
			
			console.timeEnd("WAV encoding");
			return new Blob([wavArrayBuffer], { type: 'audio/wav' });

		} catch (error) {
			console.error("WAV encoding failed:", error);
			console.timeEnd("WAV encoding");
			throw error;
		}
	}

	// =====================================================================================
	// Render

	private async renderTimeline(sampleRate: number = 48000): Promise<AudioBuffer> {
		const totalDuration = this.totalDuration;
		const tracks = this.tracks;

		const totalSamples = Math.ceil(totalDuration * sampleRate);
		const offlineContext = new OfflineAudioContext(2, totalSamples, sampleRate);
		
		const masterGainNode = offlineContext.createGain();
		masterGainNode.connect(offlineContext.destination);

		await this.renderAllTracks(offlineContext, tracks, masterGainNode);

		return await offlineContext.startRendering();
	}

	private async renderAllTracks(
		offlineContext: OfflineAudioContext,
		tracks: Track[],
		masterGainNode: GainNode
	): Promise<void> {
		
		for (const track of tracks) {
			const volume = track.volume;
			const pan = track.pan;
			const reverb = track.reverb;
			const mute = track.mute;

			// Create track nodes
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

			// Process all regions for this track - await each region
			for (const region of track.regions) {
				if (region.type === RegionType.Audio) {
					await this.renderAudioRegion(
						offlineContext,
						region, 
						trackGainNode
					);
				} else if (region.type === RegionType.Midi) {
					await this.renderMidiRegion(
						offlineContext,
						region,
						trackGainNode,
						track
					);
				}
			}
		}
	}

	private async renderAudioRegion(
		offlineContext: OfflineAudioContext,
		audioRegion: AudioRegion, 
		trackGainNode: GainNode
	): Promise<void> {
		const audioFileData = this.audioFiles[audioRegion.fileId];
		const audioBuffer = audioFileData.buffer64;

		if (!audioBuffer) {
			console.log("NO AUDIO BUFFER: ", this.projectState.metadata.projectId, audioRegion.fileId, audioFileData)
			return;	
		}

		const source = offlineContext.createBufferSource();
		source.buffer = await this.base64ToAudioBuffer(audioBuffer, offlineContext);
		source.connect(trackGainNode);

		// Calculate timing (same logic as your playback)
		const regionStart = this.posToTime(audioRegion.start);
		const audioStart = audioRegion.audioStartOffset;
		const audioEnd = audioRegion.audioEndOffset;
		const duration = audioEnd - audioStart;

		// For offline rendering, schedule everything from timeline position 0
		source.start(regionStart, audioStart, duration);
	}

	private async renderMidiRegion(
		offlineContext: OfflineAudioContext,
		midiRegion: MidiRegion, 
		trackGainNode: GainNode,
		track: Track
	): Promise<void> {
		const midiData = midiRegion.midiData;
		if (!midiData || midiData.length === 0) return;

		const regionStart = this.posToTime(midiRegion.start);
		const regionDuration = this.posToTime(midiRegion.duration);

		// Create MIDI source for offline context
		const midiSource = await this.renderer.createMidiSource(offlineContext, midiData, regionStart, regionDuration, track, track.trackType as MidiTrackType);
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

	// =====================================================================================
	// Helper

	posToTime(pos: number) {
		return pos * this.projectState.studio.timeSignature.N  / this.projectState.studio.bpm * 60; // in seconds
	}

	async base64ToAudioBuffer(base64: string, audioContext: OfflineAudioContext): Promise<AudioBuffer> {
		// 1. Convert base64 string → ArrayBuffer
		const binary = atob(base64);
		const len = binary.length;
		const bytes = new Uint8Array(len);
		for (let i = 0; i < len; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		const arrayBuffer = bytes.buffer;

		// 2. Decode audio data into AudioBuffer
		return await audioContext.decodeAudioData(arrayBuffer);
	}
}