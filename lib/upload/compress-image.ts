import imageCompression from 'browser-image-compression'

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 2000,
  useWebWorker: true,
  initialQuality: 0.85,
  fileType: 'image/jpeg' as const,
}

const SKIP_COMPRESS_BELOW_BYTES = 1 * 1024 * 1024

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  if (file.size < SKIP_COMPRESS_BELOW_BYTES) return file

  try {
    const compressed = await imageCompression(file, COMPRESSION_OPTIONS)
    return compressed
  } catch (err) {
    console.warn('Image compression failed, using original:', err)
    return file
  }
}

export async function compressImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map(compressImage))
}
