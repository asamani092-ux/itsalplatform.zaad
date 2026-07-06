export interface DetectedFileType {
  mime: string;
  ext: string;
}

export function detectFileTypeFromBytes(buffer: Buffer): DetectedFileType | null {
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "%PDF") {
    return { mime: "application/pdf", ext: "pdf" };
  }

  if (
    buffer.length >= 4 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { mime: "image/png", ext: "png" };
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }

  return null;
}
