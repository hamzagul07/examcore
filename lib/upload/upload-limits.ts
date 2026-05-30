/** Stay under Vercel's ~4.5MB serverless body limit */
export const MAX_UPLOAD_PAYLOAD_BYTES = 4_000_000

export const MAX_PDF_BYTES = 4 * 1024 * 1024

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getPdfSizeError(file: File): string | null {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return null
  }
  if (file.size > MAX_PDF_BYTES) {
    return `PDF is too large (${formatFileSize(file.size)}). Please upload separate page photos instead — max ${formatFileSize(MAX_PDF_BYTES)} for direct upload.`
  }
  return null
}

export function totalUploadBytes(files: File[]): number {
  return files.reduce((sum, f) => sum + f.size, 0)
}

export function getPayloadTooLargeError(files: File[]): string | null {
  const total = totalUploadBytes(files)
  if (total <= MAX_UPLOAD_PAYLOAD_BYTES) return null
  return `Total upload is ${formatFileSize(total)} — that's too large to send at once. Remove a page or use smaller photos (under ${formatFileSize(MAX_UPLOAD_PAYLOAD_BYTES)} total).`
}
