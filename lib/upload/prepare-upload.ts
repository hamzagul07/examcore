import { compressImage, compressImages } from './compress-image'
import { getPayloadTooLargeError, getPdfSizeError } from './upload-limits'
import type { UploadPage } from '@/components/upload/UploadPageCard'

export function hasCompressingPages(pages: UploadPage[]): boolean {
  return pages.some((p) => p.status === 'compressing')
}

export async function prepareImageFilesForSubmit(
  pageFiles: File[],
  extraImages: (File | null | undefined)[] = []
): Promise<{
  pageFiles: File[]
  extras: File[]
  error: string | null
}> {
  const compressedPages = await compressImages(pageFiles)
  const extras = await Promise.all(
    extraImages.filter((f): f is File => !!f).map((f) => compressImage(f))
  )
  const error = getPayloadTooLargeError([...compressedPages, ...extras])
  return { pageFiles: compressedPages, extras, error }
}

function isPdfFile(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

/** Single-question submit: image pages and/or one answer PDF; optional question file. */
export async function prepareSingleQuestionUpload(
  pages: UploadPage[],
  options: {
    answerPdf: File | null
    questionFile: File | null
    questionCompressing?: boolean
  }
): Promise<{
  pageFiles: File[]
  answerPdf: File | null
  questionFile: File | null
  error: string | null
}> {
  if (options.questionCompressing) {
    return {
      pageFiles: [],
      answerPdf: null,
      questionFile: null,
      error: 'Still preparing your question file — wait a moment, then try again.',
    }
  }

  if (options.answerPdf) {
    const pdfErr = getPdfSizeError(options.answerPdf)
    if (pdfErr) {
      return { pageFiles: [], answerPdf: null, questionFile: null, error: pdfErr }
    }
    const extras = options.questionFile ? [options.questionFile] : []
    const payloadErr = getPayloadTooLargeError([options.answerPdf, ...extras])
    if (payloadErr) {
      return { pageFiles: [], answerPdf: null, questionFile: null, error: payloadErr }
    }
    return {
      pageFiles: [],
      answerPdf: options.answerPdf,
      questionFile: options.questionFile,
      error: null,
    }
  }

  if (hasCompressingPages(pages)) {
    return {
      pageFiles: [],
      answerPdf: null,
      questionFile: null,
      error: 'Still optimizing images — wait a moment, then try again.',
    }
  }

  const compressedPages = await compressImages(pages.map((p) => p.file))
  let questionFile = options.questionFile
  if (questionFile && !isPdfFile(questionFile)) {
    questionFile = await compressImage(questionFile)
  }
  const payloadErr = getPayloadTooLargeError([
    ...compressedPages,
    ...(questionFile ? [questionFile] : []),
  ])
  if (payloadErr) {
    return { pageFiles: [], answerPdf: null, questionFile: null, error: payloadErr }
  }
  return {
    pageFiles: compressedPages,
    answerPdf: null,
    questionFile,
    error: null,
  }
}

export async function prepareWholePaperUpload(
  pages: UploadPage[],
  pdf: File | null
): Promise<{
  pages: UploadPage[]
  pdf: File | null
  error: string | null
}> {
  if (hasCompressingPages(pages)) {
    return {
      pages,
      pdf,
      error: 'Still optimizing images — wait a moment, then try again.',
    }
  }

  if (pdf) {
    const pdfErr = getPdfSizeError(pdf)
    if (pdfErr) return { pages, pdf, error: pdfErr }
    const payloadErr = getPayloadTooLargeError([pdf])
    if (payloadErr) return { pages, pdf, error: payloadErr }
    return { pages, pdf, error: null }
  }

  const compressedFiles = await compressImages(pages.map((p) => p.file))
  const readyPages = pages.map((p, i) => ({
    ...p,
    file: compressedFiles[i],
    fileSizeBytes: compressedFiles[i].size,
  }))
  const payloadErr = getPayloadTooLargeError(compressedFiles)
  return { pages: readyPages, pdf: null, error: payloadErr }
}
