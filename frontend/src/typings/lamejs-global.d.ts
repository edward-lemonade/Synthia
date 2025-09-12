declare global {
  const lamejs: {
    Mp3Encoder: new (
      channels: number,
      sampleRate: number,
      kbps: number
    ) => {
      encodeBuffer(left: Int16Array, right?: Int16Array): Uint8Array;
      flush(): Uint8Array;
    };
  };
}

export {};
