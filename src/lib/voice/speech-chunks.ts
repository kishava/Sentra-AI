/** Strip markdown noise and split into short speakable chunks for low-latency TTS. */
export function splitSpeechChunks(text: string, maxChunkLength = 380) {
  const plain = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_~>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!plain) return [];

  const sentences =
    plain.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((part) => part.trim()).filter(Boolean) ?? [plain];

  const chunks: string[] = [];
  let buffer = "";

  for (const sentence of sentences) {
    const candidate = buffer ? `${buffer} ${sentence}` : sentence;
    if (candidate.length <= maxChunkLength) {
      buffer = candidate;
      continue;
    }

    if (buffer) chunks.push(buffer);
    if (sentence.length <= maxChunkLength) {
      buffer = sentence;
    } else {
      const words = sentence.split(/\s+/);
      let part = "";
      for (const word of words) {
        const next = part ? `${part} ${word}` : word;
        if (next.length > maxChunkLength && part) {
          chunks.push(part);
          part = word;
        } else {
          part = next;
        }
      }
      buffer = part;
    }
  }

  if (buffer) chunks.push(buffer);

  return chunks.filter((chunk) => chunk.length >= 2).slice(0, 48);
}
