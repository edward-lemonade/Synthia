import { Injectable } from '@angular/core';
import { MidiNote, MidiRegion, MidiTrackType } from '@shared/types';
import { ViewportService } from '../viewport.service';
import { DEFAULT_SYNTH, SYNTHS } from './presets/instruments';
import { TracksService } from '../tracks.service';

export interface MidiSource {
	notes: MidiNote[];
	connect: (destination: AudioNode) => void;
	start: (when?: number, offset?: number, duration?: number) => void;
	stop: (when?: number) => void;
	noteIds: string[];
	trackId?: string;
}

export interface SynthVoice {
	oscillators: OscillatorNode[];
	gainNode: GainNode;
	filterNode: BiquadFilterNode;
	noteId: string;
	endTime: number;
	midiNote: number;
	trackId: string;
}

export interface SynthParams {
	// Oscillator settings
	waveform1: OscillatorType;
	waveform2: OscillatorType;
	osc2Detune: number;
	osc2Level: number;
	subLevel: number;
	
	// Filter settings
	cutoff: number;
	resonance: number;
	filterType: BiquadFilterType;
	filterEnvAmount: number;
	
	// Envelope settings
	attack: number;
	decay: number;
	sustain: number;
	release: number;
	
	// Filter envelope
	filterAttack: number;
	filterDecay: number;
	filterSustain: number;
	filterRelease: number;
	
	// Modulation
	lfoRate: number;
	lfoAmount: number;
	lfoTarget: 'midiNote' | 'filter' | 'amplitude';
	
	// Master settings
	volume: number;
	drive: number;
}

export interface TrackSynthConfig {
	trackId: string;
	synthParams: SynthParams;
	preset?: string;
}

@Injectable()
export class MidiSynthesizerService {
	private static _instance: MidiSynthesizerService;
	static get instance(): MidiSynthesizerService { return MidiSynthesizerService._instance; }

	private audioContext?: AudioContext;
	private activeVoices = new Map<string, SynthVoice>();
	
	// Track-specific synth configurations
	private trackSynthConfigs = new Map<string, SynthParams>();
	
	constructor() {
		MidiSynthesizerService._instance = this;
	}

	async initialize(audioContext: AudioContext) {
		this.audioContext = audioContext;
	}

	// ========================================================================================
	// MIDI Source Creation

	createMidiSource(
		midiData: MidiNote[], 
		regionStartTime: number, 
		regionDuration: number,
		trackId: string,
		offline: boolean = false,
		offlineContext?: OfflineAudioContext
	): MidiSource {
		const audioContext = offline ? offlineContext! : this.audioContext!;
		
		const noteIds: string[] = [];
		let isConnected = false;
		let outputNode: AudioNode;

		return {
			notes: [...midiData],
			trackId,
			
			connect: (destination: AudioNode) => {
				outputNode = destination;
				isConnected = true;
			},
			
			start: (when: number = 0, offset: number = 0, duration?: number) => {
				if (!isConnected || !outputNode) {
					console.warn('MIDI source not connected to output');
					return;
				}

				const actualDuration = duration ?? regionDuration;
				const endTime = when + actualDuration;
				
				if (offline) {
					this.processNotesOffline(
						audioContext as OfflineAudioContext,
						midiData,
						when,
						offset,
						endTime,
						outputNode,
						trackId,
						noteIds
					);
				} else {
					midiData.forEach((note, index) => {
						const noteStartTime = when + ViewportService.instance.posToTime(note.start) - offset;
						const noteEndTime = noteStartTime + ViewportService.instance.posToTime(note.duration);

						// Skip notes outside playback range
						if (noteEndTime <= when || noteStartTime >= endTime) {
							return;
						}
						
						// Adjust timing for partial playback
						const actualStartTime = Math.max(noteStartTime, when);
						const actualEndTime = Math.min(noteEndTime, endTime);
						const actualNoteDuration = actualEndTime - actualStartTime;
						
						if (actualNoteDuration > 0.001) { // Minimum 1ms duration
							const noteId = this.startNote(
								note.midiNote,
								note.velocity || 100,
								actualStartTime,
								actualEndTime,
								note.channel ?? 0,
								outputNode,
								trackId,
								offline,
								audioContext
							);
							
							if (noteId) {
								noteIds.push(noteId);
							}
						}
					});
				}
			},
			
			stop: (when?: number) => {
				if (offline) {
					return;
				}
				
				const stopTime = when ?? this.audioContext!.currentTime;
				noteIds.forEach(noteId => {
					this.stopNote(noteId, stopTime);
				});
			},
			
			noteIds
		};
	}

	// ========================================================================================
	// Note Management

	private processNotesOffline(
		offlineContext: OfflineAudioContext,
		midiData: MidiNote[],
		when: number,
		offset: number,
		endTime: number,
		outputNode: AudioNode,
		trackId: string,
		noteIds: string[]
	): void {
		midiData.forEach((note) => {
			const noteStartTime = when + ViewportService.instance.posToTime(note.start) - offset;
			const noteEndTime = noteStartTime + ViewportService.instance.posToTime(note.duration);

			// Skip notes outside playback range
			if (noteEndTime <= when || noteStartTime >= endTime) {
				return;
			}
			
			// Adjust timing for partial playback
			const actualStartTime = Math.max(noteStartTime, when);
			const actualEndTime = Math.min(noteEndTime, endTime);
			const actualNoteDuration = actualEndTime - actualStartTime;
			
			if (actualNoteDuration > 0.001) { // Minimum 1ms duration
				const noteId = this.startNote(
					note.midiNote,
					note.velocity || 100,
					actualStartTime,
					actualEndTime,
					note.channel ?? 0,
					outputNode,
					trackId,
					true, // offline = true
					offlineContext
				);
				
				if (noteId) {
					noteIds.push(noteId);
				}
			}
		});
	}

	private startNote(
		midiNote: number, 
		velocity: number, 
		startTime: number,
		endTime: number,
		channel: number = 0,
		outputNode: AudioNode,
		trackId: string,
		offline: boolean = false,
		audioContext?: AudioContext | OfflineAudioContext
	): string {
		// Use provided context or fall back to instance context
		const ctx = audioContext || this.audioContext!;
		
		if (!ctx) {
			console.warn('MidiSynthesizerService not initialized with AudioContext');
			return '';
		}

		const trackNode = TracksService.instance.getTrack(trackId);
		const synthParams = this.getSynthParams(trackNode ? trackNode.instrument() : '');

		// For realtime, adjust start time if in the past
		if (!offline && startTime < ctx.currentTime - 0.001) {
			startTime = ctx.currentTime;
		}

		const noteId = this.generateNoteId(midiNote, startTime, channel, trackId);
		const frequency = this.midiToFrequency(midiNote);
		const gain = this.velocityToGain(velocity) * synthParams.volume;

		try {
			// Create oscillators
			const osc1 = ctx.createOscillator();
			const osc2 = ctx.createOscillator();
			const subOsc = ctx.createOscillator();
			
			// Create gain nodes for mixing
			const osc1Gain = ctx.createGain();
			const osc2Gain = ctx.createGain();
			const subGain = ctx.createGain();
			const mixerGain = ctx.createGain();
			
			// Create filter and main gain
			const filter = ctx.createBiquadFilter();
			const ampGain = ctx.createGain();
			
			// Setup oscillators with track-specific parameters
			osc1.type = synthParams.waveform1;
			osc1.frequency.setValueAtTime(frequency, startTime);
			
			osc2.type = synthParams.waveform2;
			osc2.frequency.setValueAtTime(frequency, startTime);
			osc2.detune.setValueAtTime(synthParams.osc2Detune, startTime);
			
			subOsc.type = 'sine';
			subOsc.frequency.setValueAtTime(frequency / 2, startTime); // Sub oscillator
			
			// Setup gain levels
			osc1Gain.gain.setValueAtTime(0.5, startTime);
			osc2Gain.gain.setValueAtTime(synthParams.osc2Level, startTime);
			subGain.gain.setValueAtTime(synthParams.subLevel, startTime);
			
			// Setup filter with track-specific parameters
			filter.type = synthParams.filterType;
			filter.Q.setValueAtTime(synthParams.resonance, startTime);
			
			// Add drive/saturation effect
			const driveAmount = synthParams.drive;
			mixerGain.gain.setValueAtTime(driveAmount, startTime);
			
			// Connect audio graph
			osc1.connect(osc1Gain);
			osc2.connect(osc2Gain);
			subOsc.connect(subGain);
			
			osc1Gain.connect(mixerGain);
			osc2Gain.connect(mixerGain);
			subGain.connect(mixerGain);
			
			mixerGain.connect(filter);
			filter.connect(ampGain);
			
			// Connect directly to track's output node (no master chain here)
			ampGain.connect(outputNode);

			// Calculate envelope times using track-specific parameters
			const { attack, decay, sustain, release } = synthParams;
			const { filterAttack, filterDecay, filterSustain, filterRelease, filterEnvAmount } = synthParams;
			
			const attackEnd = startTime + attack;
			const decayEnd = attackEnd + decay;
			const noteReleaseStart = endTime;
			const noteReleaseEnd = noteReleaseStart + release;
			
			// Amplitude envelope
			ampGain.gain.setValueAtTime(0, startTime);
			ampGain.gain.linearRampToValueAtTime(gain, attackEnd);
			ampGain.gain.exponentialRampToValueAtTime(Math.max(gain * sustain, 0.001), decayEnd);
			ampGain.gain.setValueAtTime(gain * sustain, noteReleaseStart);
			ampGain.gain.exponentialRampToValueAtTime(0.001, noteReleaseEnd);
			
			// Filter envelope
			const baseCutoff = synthParams.cutoff;
			const filterPeak = Math.min(baseCutoff * (1 + filterEnvAmount), ctx.sampleRate / 3);
			const filterSustainValue = baseCutoff * (1 + filterEnvAmount * filterSustain);
			
			const filterAttackEnd = startTime + filterAttack;
			const filterDecayEnd = filterAttackEnd + filterDecay;
			const filterReleaseEnd = noteReleaseStart + filterRelease;
			
			filter.frequency.setValueAtTime(baseCutoff, startTime);
			filter.frequency.exponentialRampToValueAtTime(Math.max(filterPeak, 100), filterAttackEnd);
			filter.frequency.exponentialRampToValueAtTime(Math.max(filterSustainValue, 100), filterDecayEnd);
			filter.frequency.setValueAtTime(filterSustainValue, noteReleaseStart);
			filter.frequency.exponentialRampToValueAtTime(Math.max(baseCutoff * 0.5, 100), filterReleaseEnd);
			
			// Add LFO modulation if enabled
			if (synthParams.lfoAmount > 0) {
				this.addLFO(osc1, filter, ampGain, startTime, noteReleaseEnd, synthParams, ctx);
			}
			
			// Start oscillators
			const oscillators = [osc1, osc2, subOsc];
			oscillators.forEach(osc => {
				osc.start(startTime);
				osc.stop(noteReleaseEnd);
			});

			// Create voice object (only for realtime playback)
			if (!offline) {
				const voice: SynthVoice = {
					oscillators,
					gainNode: ampGain,
					filterNode: filter,
					noteId,
					endTime: noteReleaseEnd,
					midiNote,
					trackId
				};

				this.activeVoices.set(noteId, voice);

				osc1.addEventListener('ended', () => {
					this.activeVoices.delete(noteId);
				});
			}

			return noteId;
			
		} catch (error) {
			console.error(`Failed to start note ${noteId} on track ${trackId}:`, error);
			return '';
		}
	}

	private addLFO(
		oscillator: OscillatorNode, 
		filter: BiquadFilterNode, 
		ampGain: GainNode, 
		startTime: number, 
		endTime: number,
		synthParams: SynthParams,
		audioContext: AudioContext | OfflineAudioContext
	) {
		const lfo = audioContext.createOscillator();
		const lfoGain = audioContext.createGain();
		
		lfo.type = 'sine';
		lfo.frequency.setValueAtTime(synthParams.lfoRate, startTime);
		lfoGain.gain.setValueAtTime(synthParams.lfoAmount, startTime);
		
		lfo.connect(lfoGain);
		
		// Route LFO based on target
		switch (synthParams.lfoTarget) {
			case 'midiNote':
				lfoGain.connect(oscillator.frequency);
				break;
			case 'filter':
				const filterLfoGain = audioContext.createGain();
				filterLfoGain.gain.setValueAtTime(synthParams.cutoff * 0.3, startTime);
				lfoGain.connect(filterLfoGain);
				filterLfoGain.connect(filter.frequency);
				break;
			case 'amplitude':
				const ampLfoGain = audioContext.createGain();
				ampLfoGain.gain.setValueAtTime(0.1, startTime);
				lfoGain.connect(ampLfoGain);
				ampLfoGain.connect(ampGain.gain);
				break;
		}
		
		lfo.start(startTime);
		lfo.stop(endTime);
	}

	private stopNote(noteId: string, stopTime?: number): void {
		const voice = this.activeVoices.get(noteId);
		if (!voice) return;

		const currentTime = stopTime ?? this.audioContext!.currentTime;
		const synthParams = this.getTrackSynthParams(voice.trackId);
		const { release } = synthParams;

		// Cancel any scheduled changes and fade out smoothly
		voice.gainNode.gain.cancelScheduledValues(currentTime);
		voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, currentTime);
		voice.gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + release);

		// Also fade filter to prevent clicks
		voice.filterNode.frequency.cancelScheduledValues(currentTime);
		voice.filterNode.frequency.setValueAtTime(voice.filterNode.frequency.value, currentTime);
		voice.filterNode.frequency.exponentialRampToValueAtTime(100, currentTime + release);

		// Stop oscillators
		voice.oscillators.forEach(osc => {
			try {
				osc.stop(currentTime + release);
			} catch (e) {
				// Already stopped
			}
		});

		voice.endTime = currentTime + release;
	}

	// ========================================================================================
	// Global Controls

	stopAllNotes(stopTime?: number): void {
		const currentTime = stopTime ?? this.audioContext!.currentTime;
		
		this.activeVoices.forEach((voice, noteId) => {
			this.stopNote(noteId, currentTime);
		});
	}

	cleanup(): void {
		if (!this.audioContext) return;
		
		const currentTime = this.audioContext.currentTime;
		
		this.activeVoices.forEach((voice, noteId) => {
			if (currentTime > voice.endTime + 0.1) { // Small buffer
				this.activeVoices.delete(noteId);
			}
		});
	}

	// ========================================================================================
	// Track Management

	setTrackSynthParams(trackId: string, params: Partial<SynthParams>) {
		const existingParams = this.trackSynthConfigs.get(trackId) || { ...DEFAULT_SYNTH };
		const newParams = { ...existingParams, ...params };
		this.trackSynthConfigs.set(trackId, newParams);
	}

	applyTrackPreset(trackId: string, presetName: string) {
		const preset = SYNTHS[presetName];
		if (preset) {
			this.trackSynthConfigs.set(trackId, {...DEFAULT_SYNTH, ...preset });
		}
	}

	getTrackSynthParams(trackId: string): SynthParams {
		return this.trackSynthConfigs.get(trackId) || { ...DEFAULT_SYNTH };
	}

	getSynthParams(instrument: string): SynthParams {
		return {...DEFAULT_SYNTH, ...SYNTHS[instrument] ?? {}}
	}
	
	// ========================================================================================
	// Utility

	private midiToFrequency(midiNote: number): number {
		return 440 * Math.pow(2, (midiNote - 69) / 12);
	}

	private velocityToGain(velocity: number): number {
		return Math.pow(velocity / 127, 1.5); // Slightly curved response
	}

	private generateNoteId(midiNote: number, startTime: number, channel: number = 0, trackId: string): string {
		return `${trackId}-${channel}-${midiNote}-${startTime.toFixed(6)}`;
	}

	getActiveVoiceCount(): number {
		return this.activeVoices.size;
	}

	getTrackActiveVoiceCount(trackId: string): number {
		let count = 0;
		this.activeVoices.forEach(voice => {
			if (voice.trackId === trackId) count++;
		});
		return count;
	}

	getActiveTrackIds(): string[] {
		const trackIds = new Set<string>();
		this.activeVoices.forEach(voice => {
			trackIds.add(voice.trackId);
		});
		return Array.from(trackIds);
	}
}