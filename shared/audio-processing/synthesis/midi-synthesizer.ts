import { MidiNote, ProjectStudio } from "../../types";
import { DEFAULT_SYNTH, SYNTHS } from "./presets/instruments";

export interface SynthVoice {
	oscillators: OscillatorNode[];
	gainNode: GainNode;
	filterNode: BiquadFilterNode;
	endTime: number;
	midiNote: number;

	trackId?: string;
	noteId?: string;
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

export class MidiSynthesizer {
	declare posToTime: (pos: number) => number;
	
	constructor(
		posToTime: (pos: number) => number,
	) {
		this.posToTime = posToTime;
	}

	startNote(
		audioContext: AudioContext | OfflineAudioContext,
		outputNode: AudioNode,
		synthParams: SynthParams,
		midiData: MidiNote,
		startTime: number,
		endTime: number,
		offline?: boolean,
	): SynthVoice | null {
		const ctx = audioContext;
		
		if (!ctx) {
			console.warn('MidiSynthesizerService not initialized with AudioContext');
			return null;
		}
		if (!offline && startTime < ctx.currentTime - 0.001) { // For realtime, adjust start time if in the past
			startTime = ctx.currentTime;
		}

		const velocity = midiData.velocity;
		const midiNote = midiData.midiNote;
		
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

			const voice: SynthVoice = {
				oscillators,
				gainNode: ampGain,
				filterNode: filter,
				endTime: noteReleaseEnd,
				midiNote,
			};
			return voice;
		} catch (error) {
			return null;
		}
	}

	stopNote(voice: SynthVoice, synthParams: SynthParams, stopTime: number): void {
		const { release } = synthParams;

		// Cancel any scheduled changes and fade out smoothly
		voice.gainNode.gain.cancelScheduledValues(stopTime);
		voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, stopTime);
		voice.gainNode.gain.exponentialRampToValueAtTime(0.001, stopTime + release);

		// Also fade filter to prevent clicks
		voice.filterNode.frequency.cancelScheduledValues(stopTime);
		voice.filterNode.frequency.setValueAtTime(voice.filterNode.frequency.value, stopTime);
		voice.filterNode.frequency.exponentialRampToValueAtTime(100, stopTime + release);

		// Stop oscillators
		voice.oscillators.forEach(osc => {
			try {
				osc.stop(stopTime + release);
			} catch (e) {
				// Already stopped
			}
		});

		voice.endTime = stopTime + release;
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

	// ========================================================================================
	// Utility

	private midiToFrequency(midiNote: number): number { return 440 * Math.pow(2, (midiNote - 69) / 12); }
	private velocityToGain(velocity: number): number { return Math.pow(velocity / 127, 1.5); }
	getSynthParams(instrument: string) { return {...DEFAULT_SYNTH, ...SYNTHS[instrument] ?? {}} }
}