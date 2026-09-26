import imageCompression from 'browser-image-compression'

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 2000,
  useWebWorker: true,
  initialQuality: 0.85,
  fileType: 'image/jpeg' as const,
}

const SKIP_COMPRESS_BELOW_BYTES = 1 * 1024 * 1024

/**
 * iPhone photos arrive as HEIC. Safari decodes them; Chrome on Android and
 * every desktop browser does not, so `browser-image-compression` (a canvas
 * draw) throws. The file is still a photo the server accepts (`image/heic` is
 * on its allowlist and Gemini reads it), so it must be SENT — the old path
 * did that already — but the uploader also has to know the preview cannot be
 * drawn, or it shows a broken image over a page that will mark fine.
 */
export function isLikelyHeic(file: File): boolean {
  const type = file.type.toLowerCase()
  if (type === 'image/heic' || type === 'image/heif') return true
  // Android pickers often label a HEIC with an empty type; the name still says.
  return /\.hei[cf]$/i.test(file.name)
}

export type CompressOutcome = {
  file: File
  /**
   * False when the browser could not decode the image. The bytes are unchanged
   * and still uploadable; only the local preview is unavailable. Also false
   * when compression was skipped for size — decodability is then unknown,
   * which for preview purposes reads the same.
   */
  decoded: boolean
  /** True when the browser could not read the image at all (HEIC on Android). */
  undecodable: boolean
}

/**
 * Compress in the browser, reporting whether the image could be read.
 *
 * EXIF orientation: the compressor draws through a canvas and writes an
 * upright JPEG, which is what makes a portrait phone photo arrive upright.
 * Files under the skip threshold are sent as-is with their EXIF intact — the
 * server's OCR and every modern browser honour the orientation tag, so that
 * path was never the problem and is left alone.
 */
export async function compressImageDetailed(file: File): Promise<CompressOutcome> {
  if (!file.type.startsWith('image/') && !isLikelyHeic(file)) {
    return { file, decoded: false, undecodable: false }
  }
  if (file.size < SKIP_COMPRESS_BELOW_BYTES && !isLikelyHeic(file)) {
    return { file, decoded: false, undecodable: false }
  }

  try {
    const compressed = await imageCompression(file, COMPRESSION_OPTIONS)
    return { file: compressed, decoded: true, undecodable: false }
  } catch (err) {
    // The browser could not draw it. Send the original: the server sniffs the
    // bytes and accepts HEIC; a genuinely corrupt file is refused there with a
    // message, which is still better than dropping the page silently here.
    console.warn('Image compression failed, using original:', err)
    return { file, decoded: false, undecodable: true }
  }
}

export async function compressImage(file: File): Promise<File> {
  return (await compressImageDetailed(file)).file
}

export async function compressImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map(compressImage))
}
