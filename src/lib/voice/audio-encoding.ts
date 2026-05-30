function writeString(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const channelCount = 1;
  const sampleRate = buffer.sampleRate;
  const samples = buffer.getChannelData(0);
  const bytesPerSample = 2;
  const blockAlign = channelCount * bytesPerSample;
  const dataSize = samples.length * bytesPerSample;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

/** Convert browser recordings to WAV so batch STT providers accept the upload. */
export async function prepareTranscriptionFile(blob: Blob, mimeType?: string): Promise<File> {
  const type = mimeType || blob.type || "audio/webm";

  if (type.includes("wav")) {
    return new File([blob], "speech.wav", { type: "audio/wav" });
  }

  if (type.includes("mp4") || type.includes("mpeg")) {
    return new File([blob], "speech.mp4", { type });
  }

  if (blob.size < 256) {
    return new File([blob], "speech.webm", { type });
  }

  try {
    const audioContext = new AudioContext();
    const decoded = await audioContext.decodeAudioData(await blob.arrayBuffer());
    await audioContext.close();
    const wavBlob = audioBufferToWav(decoded);
    return new File([wavBlob], "speech.wav", { type: "audio/wav" });
  } catch {
    return new File([blob], "speech.webm", { type });
  }
}

/** MediaRecorder webm chunks cannot always be concatenated — pick the largest chunk. */
export function pickRecordingBlob(chunks: Blob[], mimeType: string): Blob | null {
  if (!chunks.length) return null;
  if (chunks.length === 1) return chunks[0]!;
  return chunks.reduce((best, chunk) => (chunk.size > best.size ? chunk : best), chunks[0]!);
}
