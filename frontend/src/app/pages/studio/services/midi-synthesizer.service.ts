import { Injectable } from '@angular/core';
import { MidiNote } from '@shared/types';
import { ViewportService } from './viewport.service';
import { DEFAULT_SYNTH, SYNTHS } from './synths';

export interface MidiSource {
	notes: MidiNote[];
	connect: (destination: AudioNode) => void;
	start: (when?: number, offset?: number, duration?: number) => void;
	stop: (when?: number) => void;
	noteIds: string[];
}

export interface SynthVoice {
	oscillators: OscillatorNode[];
	gainNode: GainNode;
	filterNode: BiquadFilterNode;
	noteId: string;
	endTime: number;
	pitch: number;
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
	lfoTarget: 'pitch' | 'filter' | 'amplitude';
	
	// Master settings
	volume: number;
	drive: number;
}

@Injectable()
export class MidiSynthesizerService {
	private static _instance: MidiSynthesizerService;
	static get instance(): MidiSynthesizerService { return MidiSynthesizerService._instance; }

	private audioContext?: AudioContext;
	private activeVoices = new Map<string, SynthVoice>();
	private masterCompressor?: DynamicsCompressorNode;
	private masterGain?: GainNode;
	
	private synthParams = DEFAULT_SYNTH;

	constructor() {
		MidiSynthesizerService._instance = this;
	}

	initialize(audioContext: AudioContext) {
		this.audioContext = audioContext;
		this.setupMasterChain();
	}

	private setupMasterChain() {
		if (!this.audioContext) return;
		
		// Master compressor for glue and preventing clips
		this.masterCompressor = this.audioContext.createDynamicsCompressor();
		this.masterCompressor.threshold.setValueAtTime(-12, this.audioContext.currentTime);
		this.masterCompressor.knee.setValueAtTime(8, this.audioContext.currentTime);
		this.masterCompressor.ratio.setValueAtTime(3, this.audioContext.currentTime);
		this.masterCompressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);
		this.masterCompressor.release.setValueAtTime(0.1, this.audioContext.currentTime);
		
		// Master gain
		this.masterGain = this.audioContext.createGain();
		this.masterGain.gain.setValueAtTime(this.synthParams.volume, this.audioContext.currentTime);
		
		// Chain: compressor -> master gain -> destination
		this.masterCompressor.connect(this.masterGain);
		this.masterGain.connect(this.audioContext.destination);
	}

	// Create a MIDI buffer source
	createMidiSource(midiData: MidiNote[], regionStartTime: number, regionDuration: number): MidiSource {
		const noteIds: string[] = [];
		let isConnected = false;
		let outputNode: AudioNode;

		return {
			notes: [...midiData],
			
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
							note.pitch,
							100,
							actualStartTime,
							actualEndTime,
							note.channel ?? 0,
							outputNode
						);
						
						if (noteId) {
							noteIds.push(noteId);
						}
					}
				});
			},
			
			stop: (when?: number) => {
				const stopTime = when ?? this.audioContext!.currentTime;
				noteIds.forEach(noteId => {
					this.stopNote(noteId, stopTime);
				});
			},
			
			noteIds
		};
	}

	private startNote(
		pitch: number, 
		velocity: number, 
		startTime: number,
		endTime: number,
		channel: number = 0,
		outputNode: AudioNode
	): string {
		if (!this.audioContext) {
			console.warn('MidiSynthesizerService not initialized with AudioContext');
			return '';
		}

		console.log(`Starting note: pitch=${pitch}, startTime=${startTime}, endTime=${endTime}`);

		// Ensure timing is valid
		if (startTime < this.audioContext.currentTime - 0.001) {
			console.log(`Adjusting start time from ${startTime} to ${this.audioContext.currentTime}`);
			startTime = this.audioContext.currentTime;
		}

		const noteId = this.generateNoteId(pitch, startTime, channel);
		const frequency = this.midiToFrequency(pitch);
		const gain = this.velocityToGain(velocity);

		try {
			// Create oscillators
			const osc1 = this.audioContext.createOscillator();
			const osc2 = this.audioContext.createOscillator();
			const subOsc = this.audioContext.createOscillator();
			
			// Create gain nodes for mixing
			const osc1Gain = this.audioContext.createGain();
			const osc2Gain = this.audioContext.createGain();
			const subGain = this.audioContext.createGain();
			const mixerGain = this.audioContext.createGain();
			
			// Create filter and main gain
			const filter = this.audioContext.createBiquadFilter();
			const ampGain = this.audioContext.createGain();
			
			// Setup oscillators
			osc1.type = this.synthParams.waveform1;
			osc1.frequency.setValueAtTime(frequency, startTime);
			
			osc2.type = this.synthParams.waveform2;
			osc2.frequency.setValueAtTime(frequency, startTime);
			osc2.detune.setValueAtTime(this.synthParams.osc2Detune, startTime);
			
			subOsc.type = 'sine';
			subOsc.frequency.setValueAtTime(frequency / 2, startTime); // Sub oscillator
			
			// Setup gain levels
			osc1Gain.gain.setValueAtTime(0.5, startTime);
			osc2Gain.gain.setValueAtTime(this.synthParams.osc2Level, startTime);
			subGain.gain.setValueAtTime(this.synthParams.subLevel, startTime);
			
			// Setup filter
			filter.type = this.synthParams.filterType;
			filter.Q.setValueAtTime(this.synthParams.resonance, startTime);
			
			// Add subtle drive/saturation effect
			const driveAmount = this.synthParams.drive;
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
			
			// Connect to master compressor or direct output
			if (this.masterCompressor) {
				ampGain.connect(this.masterCompressor);
				
			} else {
				ampGain.connect(outputNode);
			}

			// Calculate envelope times
			const { attack, decay, sustain, release } = this.synthParams;
			const { filterAttack, filterDecay, filterSustain, filterRelease, filterEnvAmount } = this.synthParams;
			
			const attackEnd = startTime + attack;
			const decayEnd = attackEnd + decay;
			const noteReleaseStart = endTime;
			const noteReleaseEnd = noteReleaseStart + release;
			
			// Amplitude envelope (CRITICAL: proper release to prevent pops)
			ampGain.gain.setValueAtTime(0, startTime);
			ampGain.gain.linearRampToValueAtTime(gain, attackEnd);
			ampGain.gain.exponentialRampToValueAtTime(Math.max(gain * sustain, 0.001), decayEnd);
			ampGain.gain.setValueAtTime(gain * sustain, noteReleaseStart);
			ampGain.gain.exponentialRampToValueAtTime(0.001, noteReleaseEnd); // Smooth release
			
			// Filter envelope
			const baseCutoff = this.synthParams.cutoff;
			const filterPeak = Math.min(baseCutoff * (1 + filterEnvAmount), this.audioContext.sampleRate / 3);
			const filterSustainValue = baseCutoff * (1 + filterEnvAmount * filterSustain);
			
			const filterAttackEnd = startTime + filterAttack;
			const filterDecayEnd = filterAttackEnd + filterDecay;
			const filterReleaseEnd = noteReleaseStart + filterRelease;
			
			filter.frequency.setValueAtTime(baseCutoff, startTime);
			filter.frequency.exponentialRampToValueAtTime(Math.max(filterPeak, 100), filterAttackEnd);
			filter.frequency.exponentialRampToValueAtTime(Math.max(filterSustainValue, 100), filterDecayEnd);
			filter.frequency.setValueAtTime(filterSustainValue, noteReleaseStart);
			filter.frequency.exponentialRampToValueAtTime(Math.max(baseCutoff * 0.5, 100), filterReleaseEnd);
			
			// Add subtle LFO modulation
			if (this.synthParams.lfoAmount > 0) {
				this.addLFO(osc1, filter, ampGain, startTime, noteReleaseEnd);
			}
			
			// Start oscillators
			const oscillators = [osc1, osc2, subOsc];
			oscillators.forEach(osc => {
				osc.start(startTime);
				osc.stop(noteReleaseEnd);
			});

			// Create voice object
			const voice: SynthVoice = {
				oscillators,
				gainNode: ampGain,
				filterNode: filter,
				noteId,
				endTime: noteReleaseEnd,
				pitch
			};

			this.activeVoices.set(noteId, voice);

			// Cleanup when note ends
			osc1.addEventListener('ended', () => {
				console.log("ended", pitch);
				this.activeVoices.delete(noteId);
			});

			return noteId;
			
		} catch (error) {
			console.error(`Failed to start note ${noteId}:`, error);
			return '';
		}
	}

	private addLFO(
		oscillator: OscillatorNode, 
		filter: BiquadFilterNode, 
		ampGain: GainNode, 
		startTime: number, 
		endTime: number
	) {
		if (!this.audioContext) return;
		
		const lfo = this.audioContext.createOscillator();
		const lfoGain = this.audioContext.createGain();
		
		lfo.type = 'sine';
		lfo.frequency.setValueAtTime(this.synthParams.lfoRate, startTime);
		lfoGain.gain.setValueAtTime(this.synthParams.lfoAmount, startTime);
		
		lfo.connect(lfoGain);
		
		// Route LFO based on target
		switch (this.synthParams.lfoTarget) {
			case 'pitch':
				lfoGain.connect(oscillator.frequency);
				break;
			case 'filter':
				const filterLfoGain = this.audioContext.createGain();
				filterLfoGain.gain.setValueAtTime(this.synthParams.cutoff * 0.3, startTime);
				lfoGain.connect(filterLfoGain);
				filterLfoGain.connect(filter.frequency);
				break;
			case 'amplitude':
				const ampLfoGain = this.audioContext.createGain();
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
		const { release } = this.synthParams;

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
	// Custom presets

	applyPreset(presetName: string): void {
		const preset = SYNTHS[presetName];
		if (preset) {
			this.setSynthParams(preset);
		}
	}

	setSynthParams(params: Partial<SynthParams>) {
		this.synthParams = { ...this.synthParams, ...params };
		
		// Update master volume if changed
		if (params.volume !== undefined && this.masterGain) {
			this.masterGain.gain.setTargetAtTime(params.volume, this.audioContext!.currentTime, 0.1);
		}
	}

	getSynthParams(): SynthParams {
		return { ...this.synthParams };
	}

	// ========================================================================================
	// Helpers and conversions

	private midiToFrequency(midiNote: number): number {
		return 440 * Math.pow(2, (midiNote - 69) / 12);
	}

	private velocityToGain(velocity: number): number {
		return Math.pow(velocity / 127, 1.5); // Slightly curved response
	}

	private generateNoteId(pitch: number, startTime: number, channel: number = 0): string {
		return `${channel}-${pitch}-${startTime.toFixed(6)}`;
	}

	getActiveVoiceCount(): number {
		return this.activeVoices.size;
	}

}