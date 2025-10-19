import { 
	RpClipLayer, 
	RpTrackLayer, 
	RpMasterLayer,
	RpNode,
	RpNativeNodeType,
	RpGain,
	RpPan,
	RpReverb,
	RpFadeIn,
	RpFadeOut,
	RpEQ,
	RpCompression,
	RpLimiter,
	RpGate,
	RpDelay,
	RpFlanger,
	RpPhaser,
	RpDistortion,
	RpOverdrive,
	RpFuzz,
	RpSoftClip,
	RpHardClip,
	RpSaturation,
	RpBitcrush,
	RpCustomDistortion
} from '../../types/studio/AudioPipeline';

interface AudioNodeChain {
	input: AudioNode;
	output: AudioNode;
	nodes: AudioNode[];
	cleanup: () => void;
}

export class AudioPipelineBuilder {
	private context: AudioContext;

	constructor(context: AudioContext) {
		this.context = context;
	}

	buildPipeline(
		masterLayer: RpMasterLayer,
	): AudioNodeChain {
		const masterChain = this.buildMasterLayer(masterLayer);
		masterChain.output.connect(this.context.destination);

		// Return the complete chain
		return masterChain;
	}

	private buildClipLayer(layer: RpClipLayer): AudioNodeChain {
		return this.buildNodeChain(layer.nodes);
	}
	private buildTrackLayer(layer: RpTrackLayer): AudioNodeChain {
		const chain = this.buildNodeChain(layer.nodes);

		layer.children.forEach(clipLayer => {
			const childChain = this.buildClipLayer(clipLayer);
			childChain.output.connect(chain.input);
		})

		return chain;
	}
	private buildMasterLayer(layer: RpMasterLayer): AudioNodeChain {
		const chain = this.buildNodeChain(layer.nodes);

		layer.children.forEach(trackLayer => {
			const childChain = this.buildTrackLayer(trackLayer);
			childChain.output.connect(chain.input);
		})
		
		return chain;
	}

	private buildNodeChain(nodeConfigs: RpNode[]): AudioNodeChain {
		if (nodeConfigs.length === 0) {
			// Empty chain, create passthrough
			const gain = this.context.createGain();
			return {
				input: gain,
				output: gain,
				nodes: [gain],
				cleanup: () => gain.disconnect()
			};
		}

		const chains = nodeConfigs.map(config => this.buildNode(config));
		
		// Connect chains together
		for (let i = 0; i < chains.length - 1; i++) {
			chains[i].output.connect(chains[i + 1].input);
		}

		const allNodes = chains.flatMap(c => c.nodes);

		return {
			input: chains[0].input,
			output: chains[chains.length - 1].output,
			nodes: allNodes,
			cleanup: () => chains.forEach(c => c.cleanup())
		};
	}

	private buildNode(config: RpNode): AudioNodeChain {
		switch (config.type) {
			case RpNativeNodeType.Gain:
				return this.buildGain(config as RpGain);
			case RpNativeNodeType.Pan:
				return this.buildPan(config as RpPan);
			case RpNativeNodeType.Reverb:
				return this.buildReverb(config as RpReverb);
			case RpNativeNodeType.FadeIn:
				return this.buildFadeIn(config as RpFadeIn);
			case RpNativeNodeType.FadeOut:
				return this.buildFadeOut(config as RpFadeOut);
			case RpNativeNodeType.EQ:
				return this.buildEQ(config as RpEQ);
			case RpNativeNodeType.Compression:
				return this.buildCompression(config as RpCompression);
			case RpNativeNodeType.Limiter:
				return this.buildLimiter(config as RpLimiter);
			case RpNativeNodeType.Gate:
				return this.buildGate(config as RpGate);
			case RpNativeNodeType.Delay:
				return this.buildDelay(config as RpDelay);
			case RpNativeNodeType.Flanger:
				return this.buildFlanger(config as RpFlanger);
			case RpNativeNodeType.Phaser:
				return this.buildPhaser(config as RpPhaser);
			case RpNativeNodeType.Distortion:
				return this.buildDistortion(config as RpDistortion);
			case RpNativeNodeType.Overdrive:
				return this.buildOverdrive(config as RpOverdrive);
			case RpNativeNodeType.Fuzz:
				return this.buildFuzz(config as RpFuzz);
			case RpNativeNodeType.SoftClip:
				return this.buildSoftClip(config as RpSoftClip);
			case RpNativeNodeType.HardClip:
				return this.buildHardClip(config as RpHardClip);
			case RpNativeNodeType.Saturation:
				return this.buildSaturation(config as RpSaturation);
			case RpNativeNodeType.Bitcrush:
				return this.buildBitcrush(config as RpBitcrush);
			case RpNativeNodeType.CustomDistortion:
				return this.buildCustomDistortion(config as RpCustomDistortion);
			default:
				throw new Error(`Unsupported node type: ${config.type}`);
		}
	}

	// ========================================================================
	// Node Builders

	private buildGain(config: RpGain): AudioNodeChain {
		const gain = this.context.createGain();
		gain.gain.value = config.params.gain;
		
		return {
			input: gain,
			output: gain,
			nodes: [gain],
			cleanup: () => gain.disconnect()
		};
	}

	private buildPan(config: RpPan): AudioNodeChain {
		const pan = this.context.createStereoPanner();
		pan.pan.value = config.params.pan;
		
		return {
			input: pan,
			output: pan,
			nodes: [pan],
			cleanup: () => pan.disconnect()
		};
	}

	private buildReverb(config: RpReverb): AudioNodeChain {
		const convolver = this.context.createConvolver();
		const dryGain = this.context.createGain();
		const wetGain = this.context.createGain();
		const inputGain = this.context.createGain();
		const outputGain = this.context.createGain();

		// Generate impulse response
		const impulse = this.generateImpulseResponse(config.params.reverb);
		convolver.buffer = impulse;

		// Set mix levels
		wetGain.gain.value = config.params.reverb;
		dryGain.gain.value = 1 - config.params.reverb;

		// Connect: input -> dry -> output
		//                -> convolver -> wet -> output
		inputGain.connect(dryGain);
		inputGain.connect(convolver);
		convolver.connect(wetGain);
		dryGain.connect(outputGain);
		wetGain.connect(outputGain);

		return {
			input: inputGain,
			output: outputGain,
			nodes: [inputGain, convolver, dryGain, wetGain, outputGain],
			cleanup: () => {
				inputGain.disconnect();
				convolver.disconnect();
				dryGain.disconnect();
				wetGain.disconnect();
				outputGain.disconnect();
			}
		};
	}

	private buildFadeIn(config: RpFadeIn): AudioNodeChain {
		const gain = this.context.createGain();
		gain.gain.value = 0;
		gain.gain.linearRampToValueAtTime(1, this.context.currentTime + config.params.time);
		
		return {
			input: gain,
			output: gain,
			nodes: [gain],
			cleanup: () => gain.disconnect()
		};
	}

	private buildFadeOut(config: RpFadeOut): AudioNodeChain {
		const gain = this.context.createGain();
		gain.gain.value = 1;
		gain.gain.linearRampToValueAtTime(0, this.context.currentTime + config.params.time);
		
		return {
			input: gain,
			output: gain,
			nodes: [gain],
			cleanup: () => gain.disconnect()
		};
	}

	private buildEQ(config: RpEQ): AudioNodeChain {
		const lowShelf = this.context.createBiquadFilter();
		lowShelf.type = 'lowshelf';
		lowShelf.frequency.value = config.params.lowShelf.freq;
		lowShelf.gain.value = config.params.lowShelf.gain;
		lowShelf.Q.value = config.params.lowShelf.Q;

		const lowMid = this.context.createBiquadFilter();
		lowMid.type = 'peaking';
		lowMid.frequency.value = config.params.lowMid.freq;
		lowMid.gain.value = config.params.lowMid.gain;
		lowMid.Q.value = config.params.lowMid.Q;

		const mid = this.context.createBiquadFilter();
		mid.type = 'peaking';
		mid.frequency.value = config.params.mid.freq;
		mid.gain.value = config.params.mid.gain;
		mid.Q.value = config.params.mid.Q;

		const highMid = this.context.createBiquadFilter();
		highMid.type = 'peaking';
		highMid.frequency.value = config.params.highMid.freq;
		highMid.gain.value = config.params.highMid.gain;
		highMid.Q.value = config.params.highMid.Q;

		const highShelf = this.context.createBiquadFilter();
		highShelf.type = 'highshelf';
		highShelf.frequency.value = config.params.highShelf.freq;
		highShelf.gain.value = config.params.highShelf.gain;
		highShelf.Q.value = config.params.highShelf.Q;

		// Chain filters
		lowShelf.connect(lowMid);
		lowMid.connect(mid);
		mid.connect(highMid);
		highMid.connect(highShelf);

		return {
			input: lowShelf,
			output: highShelf,
			nodes: [lowShelf, lowMid, mid, highMid, highShelf],
			cleanup: () => {
				lowShelf.disconnect();
				lowMid.disconnect();
				mid.disconnect();
				highMid.disconnect();
				highShelf.disconnect();
			}
		};
	}

	private buildCompression(config: RpCompression): AudioNodeChain {
		const compressor = this.context.createDynamicsCompressor();
		const makeupGain = this.context.createGain();

		compressor.threshold.value = config.params.threshold;
		compressor.knee.value = config.params.knee;
		compressor.ratio.value = config.params.ratio;
		compressor.attack.value = config.params.attack;
		compressor.release.value = config.params.release;
		makeupGain.gain.value = config.params.makeupGain;

		compressor.connect(makeupGain);

		return {
			input: compressor,
			output: makeupGain,
			nodes: [compressor, makeupGain],
			cleanup: () => {
				compressor.disconnect();
				makeupGain.disconnect();
			}
		};
	}

	private buildLimiter(config: RpLimiter): AudioNodeChain {
		const compressor = this.context.createDynamicsCompressor();
		
		// Aggressive limiter settings
		compressor.threshold.value = config.params.threshold;
		compressor.knee.value = 0;
		compressor.ratio.value = 20;
		compressor.attack.value = 0.001;
		compressor.release.value = config.params.release;

		return {
			input: compressor,
			output: compressor,
			nodes: [compressor],
			cleanup: () => compressor.disconnect()
		};
	}

	private buildGate(config: RpGate): AudioNodeChain {
		// TODO: Implement with AudioWorkletNode for proper gate behavior
		// For now, return a passthrough with a gain node
		const gain = this.context.createGain();
		
		// Simple threshold-based gating (placeholder)
		// Real implementation would use AudioWorklet with envelope follower
		console.warn('Gate node not fully implemented - using passthrough');

		return {
			input: gain,
			output: gain,
			nodes: [gain],
			cleanup: () => gain.disconnect()
		};
	}

	private buildDelay(config: RpDelay): AudioNodeChain {
		const inputGain = this.context.createGain();
		const delayNode = this.context.createDelay(5.0);
		const feedbackGain = this.context.createGain();
		const lowpass = this.context.createBiquadFilter();
		const wetGain = this.context.createGain();
		const dryGain = this.context.createGain();
		const outputGain = this.context.createGain();

		delayNode.delayTime.value = config.params.delayTime;
		feedbackGain.gain.value = config.params.feedback;
		lowpass.type = 'lowpass';
		lowpass.frequency.value = config.params.lowpassFreq;
		wetGain.gain.value = config.params.mix;
		dryGain.gain.value = 1 - config.params.mix;

		// Routing: input -> dry -> output
		//                 -> delay -> lowpass -> feedback -> delay
		//                          -> wet -> output
		inputGain.connect(dryGain);
		inputGain.connect(delayNode);
		delayNode.connect(lowpass);
		lowpass.connect(feedbackGain);
		feedbackGain.connect(delayNode);
		lowpass.connect(wetGain);
		dryGain.connect(outputGain);
		wetGain.connect(outputGain);

		return {
			input: inputGain,
			output: outputGain,
			nodes: [inputGain, delayNode, feedbackGain, lowpass, wetGain, dryGain, outputGain],
			cleanup: () => {
				inputGain.disconnect();
				delayNode.disconnect();
				feedbackGain.disconnect();
				lowpass.disconnect();
				wetGain.disconnect();
				dryGain.disconnect();
				outputGain.disconnect();
			}
		};
	}

	private buildFlanger(config: RpFlanger): AudioNodeChain {
		const inputGain = this.context.createGain();
		const delayNode = this.context.createDelay(0.02);
		const lfo = this.context.createOscillator();
		const lfoGain = this.context.createGain();
		const feedbackGain = this.context.createGain();
		const wetGain = this.context.createGain();
		const dryGain = this.context.createGain();
		const outputGain = this.context.createGain();

		lfo.frequency.value = config.params.speed;
		lfoGain.gain.value = config.params.depth;
		feedbackGain.gain.value = config.params.feedback;
		wetGain.gain.value = config.params.mix;
		dryGain.gain.value = 1 - config.params.mix;

		// LFO modulates delay time
		lfo.connect(lfoGain);
		lfoGain.connect(delayNode.delayTime);

		// Signal routing
		inputGain.connect(dryGain);
		inputGain.connect(delayNode);
		delayNode.connect(feedbackGain);
		feedbackGain.connect(delayNode);
		delayNode.connect(wetGain);
		dryGain.connect(outputGain);
		wetGain.connect(outputGain);

		lfo.start();

		return {
			input: inputGain,
			output: outputGain,
			nodes: [inputGain, delayNode, lfo, lfoGain, feedbackGain, wetGain, dryGain, outputGain],
			cleanup: () => {
				lfo.stop();
				inputGain.disconnect();
				delayNode.disconnect();
				lfo.disconnect();
				lfoGain.disconnect();
				feedbackGain.disconnect();
				wetGain.disconnect();
				dryGain.disconnect();
				outputGain.disconnect();
			}
		};
	}

	private buildPhaser(config: RpPhaser): AudioNodeChain {
		const inputGain = this.context.createGain();
		const outputGain = this.context.createGain();
		const lfo = this.context.createOscillator();
		const lfoGain = this.context.createGain();
		const feedbackGain = this.context.createGain();
		const wetGain = this.context.createGain();
		const dryGain = this.context.createGain();

		lfo.frequency.value = config.params.speed;
		lfoGain.gain.value = config.params.depth * 1000; // Scale for frequency modulation
		feedbackGain.gain.value = config.params.feedback;
		wetGain.gain.value = config.params.mix;
		dryGain.gain.value = 1 - config.params.mix;

		// Create allpass filter chain
		const filters: BiquadFilterNode[] = [];
		for (let i = 0; i < config.params.stages; i++) {
			const filter = this.context.createBiquadFilter();
			filter.type = 'allpass';
			filter.frequency.value = 1000;
			filters.push(filter);
		}

		// LFO modulates all filter frequencies
		for (const filter of filters) {
			lfo.connect(lfoGain);
			lfoGain.connect(filter.frequency);
		}

		// Chain filters
		let prevNode: AudioNode = inputGain;
		for (const filter of filters) {
			prevNode.connect(filter);
			prevNode = filter;
		}

		// Feedback and mixing
		prevNode.connect(feedbackGain);
		feedbackGain.connect(inputGain);
		prevNode.connect(wetGain);
		inputGain.connect(dryGain);
		wetGain.connect(outputGain);
		dryGain.connect(outputGain);

		lfo.start();

		return {
			input: inputGain,
			output: outputGain,
			nodes: [inputGain, outputGain, lfo, lfoGain, feedbackGain, wetGain, dryGain, ...filters],
			cleanup: () => {
				lfo.stop();
				inputGain.disconnect();
				outputGain.disconnect();
				lfo.disconnect();
				lfoGain.disconnect();
				feedbackGain.disconnect();
				wetGain.disconnect();
				dryGain.disconnect();
				filters.forEach(f => f.disconnect());
			}
		};
	}

	private buildDistortion(config: RpDistortion): AudioNodeChain {
		return this.buildWaveshaperEffect(
			this.makeDistortionCurve(config.params.amount),
			config.params.tone,
			config.params.outputGain
		);
	}

	private buildOverdrive(config: RpOverdrive): AudioNodeChain {
		return this.buildWaveshaperEffect(
			this.makeOverdriveCurve(config.params.drive),
			config.params.tone,
			config.params.outputGain
		);
	}

	private buildFuzz(config: RpFuzz): AudioNodeChain {
		return this.buildWaveshaperEffect(
			this.makeFuzzCurve(config.params.fuzz),
			0.5,
			config.params.outputGain
		);
	}

	private buildSoftClip(config: RpSoftClip): AudioNodeChain {
		return this.buildWaveshaperEffect(
			this.makeSoftClipCurve(config.params.threshold, config.params.knee),
			1.0,
			1.0
		);
	}

	private buildHardClip(config: RpHardClip): AudioNodeChain {
		return this.buildWaveshaperEffect(
			this.makeHardClipCurve(config.params.threshold),
			1.0,
			1.0
		);
	}

	private buildSaturation(config: RpSaturation): AudioNodeChain {
		return this.buildWaveshaperEffect(
			this.makeSaturationCurve(config.params.drive, config.params.harmonics),
			1.0,
			config.params.outputGain
		);
	}

	private buildBitcrush(config: RpBitcrush): AudioNodeChain {
		// TODO: Requires AudioWorkletNode for proper implementation
		console.warn('Bitcrush not fully implemented - using passthrough');
		const gain = this.context.createGain();
		return {
			input: gain,
			output: gain,
			nodes: [gain],
			cleanup: () => gain.disconnect()
		};
	}

	private buildCustomDistortion(config: RpCustomDistortion): AudioNodeChain {
		const shaper = this.context.createWaveShaper();
		shaper.curve = config.params.curve as Float32Array<ArrayBuffer>;
		shaper.oversample = config.params.oversample;

		return {
			input: shaper,
			output: shaper,
			nodes: [shaper],
			cleanup: () => shaper.disconnect()
		};
	}

	// ========================================================================
	// Helper Functions
	// ========================================================================

	private buildWaveshaperEffect(
		curve: Float32Array,
		tone: number,
		outputGain: number
	): AudioNodeChain {
		const shaper = this.context.createWaveShaper();
		const lowpass = this.context.createBiquadFilter();
		const gain = this.context.createGain();

		shaper.curve = curve as Float32Array<ArrayBuffer>;
		shaper.oversample = '4x';

		lowpass.type = 'lowpass';
		lowpass.frequency.value = 20000 * tone; // Tone control via lowpass

		gain.gain.value = outputGain;

		shaper.connect(lowpass);
		lowpass.connect(gain);

		return {
			input: shaper,
			output: gain,
			nodes: [shaper, lowpass, gain],
			cleanup: () => {
				shaper.disconnect();
				lowpass.disconnect();
				gain.disconnect();
			}
		};
	}

	private makeDistortionCurve(amount: number): Float32Array {
		const samples = 4096;
		const curve = new Float32Array(samples);
		const deg = Math.PI / 180;
		
		for (let i = 0; i < samples; i++) {
			const x = (i * 2) / samples - 1;
			curve[i] = (3 + amount * 100) * x * 20 * deg / (Math.PI + amount * 100 * Math.abs(x));
		}
		
		return curve;
	}

	private makeOverdriveCurve(drive: number): Float32Array {
		const samples = 4096;
		const curve = new Float32Array(samples);
		
		for (let i = 0; i < samples; i++) {
			const x = (i * 2) / samples - 1;
			curve[i] = Math.tanh(x * (1 + drive * 10));
		}
		
		return curve;
	}

	private makeFuzzCurve(fuzz: number): Float32Array {
		const samples = 4096;
		const curve = new Float32Array(samples);
		
		for (let i = 0; i < samples; i++) {
			const x = (i * 2) / samples - 1;
			const distorted = x * (1 + fuzz * 50);
			curve[i] = Math.sign(distorted) * Math.min(Math.abs(distorted), 1);
		}
		
		return curve;
	}

	private makeSoftClipCurve(threshold: number, knee: number): Float32Array {
		const samples = 4096;
		const curve = new Float32Array(samples);
		
		for (let i = 0; i < samples; i++) {
			const x = (i * 2) / samples - 1;
			const absX = Math.abs(x);
			
			if (absX < threshold - knee) {
				curve[i] = x;
			} else if (absX < threshold + knee) {
				const t = (absX - threshold + knee) / (2 * knee);
				curve[i] = Math.sign(x) * (threshold + knee * (1 - Math.cos(t * Math.PI)) / 2);
			} else {
				curve[i] = Math.sign(x) * threshold;
			}
		}
		
		return curve;
	}

	private makeHardClipCurve(threshold: number): Float32Array {
		const samples = 4096;
		const curve = new Float32Array(samples);
		
		for (let i = 0; i < samples; i++) {
			const x = (i * 2) / samples - 1;
			curve[i] = Math.max(-threshold, Math.min(threshold, x));
		}
		
		return curve;
	}

	private makeSaturationCurve(drive: number, harmonics: number): Float32Array {
		const samples = 4096;
		const curve = new Float32Array(samples);
		
		for (let i = 0; i < samples; i++) {
			const x = (i * 2) / samples - 1;
			const saturated = Math.tanh(x * drive);
			// Blend even/odd harmonics
			curve[i] = saturated * (1 - harmonics) + Math.sign(saturated) * Math.pow(Math.abs(saturated), 0.7) * harmonics;
		}
		
		return curve;
	}

	private generateImpulseResponse(decay: number): AudioBuffer {
		const sampleRate = this.context.sampleRate;
		const length = sampleRate * 2; // 2 second reverb
		const impulse = this.context.createBuffer(2, length, sampleRate);

		for (let channel = 0; channel < 2; channel++) {
			const channelData = impulse.getChannelData(channel);
			for (let i = 0; i < length; i++) {
				channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3 * decay);
			}
		}

		return impulse;
	}
}