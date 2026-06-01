'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import JSZip from 'jszip'
import {
  AlertCircle,
  CheckCircle2,
  FileArchive,
  Loader2,
  Upload,
  XCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

const STORAGE_BUCKET = 'paper-pdfs'
const UPLOAD_CONCURRENCY = 10
const AVAILABLE_YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026]

const STORAGE_BOARDS = [
  { id: 'cambridge', label: 'Cambridge A-Level' },
  { id: 'cambridge-o-level', label: 'Cambridge O-Level' },
] as const

const SUBJECT_NAMES: Record<string, string> = {
  '9709': 'Mathematics',
  '9231': 'Further Mathematics',
  '9702': 'Physics',
  '9701': 'Chemistry',
  '9700': 'Biology',
  '9608': 'Computer Science',
  '9618': 'Computer Science',
  '2210': 'Computer Science (O-Level)',
  '9707': 'Business',
  '9706': 'Accounting',
  '7707': 'Accounting (O-Level)',
  '9708': 'Economics',
  '2281': 'Economics (O-Level)',
  '4024': 'Mathematics (O-Level)',
  '4037': 'Additional Mathematics (O-Level)',
  '5054': 'Physics (O-Level)',
  '5070': 'Chemistry (O-Level)',
  '5090': 'Biology (O-Level)',
  '7115': 'Business Studies (O-Level)',
  '9695': 'English Literature',
}

type ParsedFilename =
  | {
      valid: true
      subject_code: string
      session_code: string
      year: number
      type: string
      component: string
    }
  | { valid: false; reason: string }

type ScannedEntry = {
  zipPath: string
  basename: string
  parsed: ParsedFilename
}

type ScanResult = {
  totalPdfs: number
  validEntries: ScannedEntry[]
  invalidEntries: ScannedEntry[]
  yearBreakdown: Record<number, number>
  subjectBreakdown: Record<string, number>
}

type UploadLogEntry = {
  level: 'info' | 'success' | 'error'
  message: string
}

const EMPTY_SCAN_RESULT: ScanResult = {
  totalPdfs: 0,
  validEntries: [],
  invalidEntries: [],
  yearBreakdown: {},
  subjectBreakdown: {},
}

function parseFilename(rawBasename: string): ParsedFilename {
  const basename = rawBasename.toLowerCase().trim()
  if (!basename.endsWith('.pdf')) {
    return { valid: false, reason: 'Not a PDF' }
  }

  const match = basename.match(/^(\d{4})_([smw])(\d{2})_([a-z]+)_(.+)\.pdf$/)
  if (!match) {
    return { valid: false, reason: 'Filename does not match Cambridge pattern' }
  }

  const [, subjectCode, sessionLetter, yearTwoDigit, type, component] = match
  const year = 2000 + parseInt(yearTwoDigit, 10)
  const sessionCode = `${sessionLetter}${yearTwoDigit}`

  return {
    valid: true,
    subject_code: subjectCode,
    session_code: sessionCode,
    year,
    type,
    component,
  }
}

function subjectLabel(code: string): string {
  return SUBJECT_NAMES[code] ? `${SUBJECT_NAMES[code]} ${code}` : `Subject ${code}`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

async function asyncPool<T>(
  concurrency: number,
  items: T[],
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  const executing = new Set<Promise<void>>()
  for (let i = 0; i < items.length; i++) {
    const p = worker(items[i], i).finally(() => {
      executing.delete(p)
    })
    executing.add(p)
    if (executing.size >= concurrency) {
      await Promise.race(executing)
    }
  }
  await Promise.all(executing)
}

export default function IngestClient() {
  const [mounted, setMounted] = useState(false)
  const zipFileRef = useRef<File | undefined>(undefined)
  const [hasZipFile, setHasZipFile] = useState(false)
  const [zipFileName, setZipFileName] = useState('')
  const [zipFileSize, setZipFileSize] = useState(0)
  const [selectedYears, setSelectedYears] = useState<Set<number>>(
    () => new Set(AVAILABLE_YEARS)
  )
  const [storagePrefix, setStoragePrefix] = useState<string>('cambridge')
  const [scanning, setScanning] = useState(false)
  const [hasScanResult, setHasScanResult] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult>(EMPTY_SCAN_RESULT)
  const [scanError, setScanError] = useState('')

  const [uploading, setUploading] = useState(false)
  const [uploadDone, setUploadDone] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [currentFile, setCurrentFile] = useState<string>('')
  const [uploadLog, setUploadLog] = useState<UploadLogEntry[]>([])
  const [uploadSummary, setUploadSummary] = useState({
    uploaded: 0,
    failed: 0,
    skipped: 0,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  const entriesToUpload = useMemo(() => {
    if (!hasScanResult) return []
    return scanResult.validEntries.filter(
      (e) => e.parsed.valid && selectedYears.has(e.parsed.year)
    )
  }, [hasScanResult, scanResult, selectedYears])

  const yearFilteredOut = useMemo(() => {
    if (!hasScanResult) return 0
    return scanResult.validEntries.length - entriesToUpload.length
  }, [hasScanResult, scanResult, entriesToUpload])

  function toggleYear(year: number) {
    setSelectedYears((prev) => {
      const next = new Set(prev)
      if (next.has(year)) next.delete(year)
      else next.add(year)
      return next
    })
  }

  function handleZipChange(file: File | undefined) {
    if (!file) {
      zipFileRef.current = undefined
      setHasZipFile(false)
      setZipFileName('')
      setZipFileSize(0)
    } else {
      zipFileRef.current = file
      setHasZipFile(true)
      setZipFileName(file.name)
      setZipFileSize(file.size)
    }
    setHasScanResult(false)
    setScanResult(EMPTY_SCAN_RESULT)
    setScanError('')
    setUploadDone(false)
    setUploadLog([])
    setUploadSummary({ uploaded: 0, failed: 0, skipped: 0 })
    setProgress({ done: 0, total: 0 })
  }

  async function handleScan() {
    const zipFile = zipFileRef.current
    if (!hasZipFile || !zipFile) return
    setScanning(true)
    setScanError('')
    setHasScanResult(false)
    setScanResult(EMPTY_SCAN_RESULT)

    try {
      const zip = await JSZip.loadAsync(zipFile)
      const entries: ScannedEntry[] = []
      const yearBreakdown: Record<number, number> = {}
      const subjectBreakdown: Record<string, number> = {}
      const invalidEntries: ScannedEntry[] = []
      const validEntries: ScannedEntry[] = []

      zip.forEach((relativePath, zipEntry) => {
        if (zipEntry.dir) return
        if (!relativePath.toLowerCase().endsWith('.pdf')) return
        const basename = relativePath.split('/').pop() || relativePath
        const parsed = parseFilename(basename)
        const entry: ScannedEntry = { zipPath: relativePath, basename, parsed }
        entries.push(entry)

        if (parsed.valid) {
          validEntries.push(entry)
          yearBreakdown[parsed.year] = (yearBreakdown[parsed.year] || 0) + 1
          const subj = subjectLabel(parsed.subject_code)
          subjectBreakdown[subj] = (subjectBreakdown[subj] || 0) + 1
        } else {
          invalidEntries.push(entry)
        }
      })

      setScanResult({
        totalPdfs: entries.length,
        validEntries,
        invalidEntries,
        yearBreakdown,
        subjectBreakdown,
      })
      setHasScanResult(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (/memory|allocation|maximum/i.test(msg)) {
        setScanError(
          'The ZIP is too large for your browser to open. Try splitting it into smaller archives.'
        )
      } else {
        setScanError(`Could not open ZIP: ${msg}`)
      }
    } finally {
      setScanning(false)
    }
  }

  async function handleUpload() {
    const zipFile = zipFileRef.current
    if (!hasZipFile || !zipFile || !hasScanResult) return
    setUploading(true)
    setUploadDone(false)
    setUploadLog([])
    setUploadSummary({ uploaded: 0, failed: 0, skipped: 0 })
    setProgress({ done: 0, total: entriesToUpload.length })

    const supabase = createClient()
    const zip = await JSZip.loadAsync(zipFile)

    let uploaded = 0
    let failed = 0
    let skipped = 0

    const appendLog = (entry: UploadLogEntry) => {
      setUploadLog((prev) => [...prev.slice(-199), entry])
    }

    await asyncPool(UPLOAD_CONCURRENCY, entriesToUpload, async (entry) => {
      if (!entry.parsed.valid) return
      const { subject_code, session_code, type, component } = entry.parsed
      const storagePath = `${storagePrefix}/${subject_code}/${session_code}/${type}_${component}.pdf`

      try {
        const zipObject = zip.file(entry.zipPath)
        if (!zipObject) {
          skipped += 1
          appendLog({
            level: 'error',
            message: `Skipped ${entry.basename}: entry not found in archive`,
          })
          return
        }

        const blob = await zipObject.async('blob')
        if (blob.size < 100) {
          skipped += 1
          appendLog({
            level: 'error',
            message: `Skipped ${entry.basename}: empty or invalid PDF`,
          })
          return
        }

        setCurrentFile(`${entry.basename} → ${storagePath}`)

        const pdfBlob = new Blob([blob], { type: 'application/pdf' })
        const { error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, pdfBlob, {
            upsert: true,
            contentType: 'application/pdf',
          })

        if (error) {
          failed += 1
          appendLog({
            level: 'error',
            message: `Failed ${entry.basename}: ${error.message}`,
          })
        } else {
          uploaded += 1
          appendLog({
            level: 'success',
            message: `Uploaded ${entry.basename} → ${storagePath}`,
          })
        }
      } catch (err) {
        failed += 1
        const msg = err instanceof Error ? err.message : String(err)
        appendLog({ level: 'error', message: `Failed ${entry.basename}: ${msg}` })
      } finally {
        setProgress((prev) => ({ done: prev.done + 1, total: prev.total }))
        setUploadSummary({ uploaded, failed, skipped })
      }
    })

    setCurrentFile('')
    setUploading(false)
    setUploadDone(true)
  }

  const scanReady = hasZipFile && !scanning
  const uploadReady =
    hasScanResult && entriesToUpload.length > 0 && !uploading && !scanning
  const progressPct =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  if (!mounted) return null

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50/30 via-white to-white px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10">
          <p className="mb-1 text-sm font-medium text-emerald-700">ADMIN</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Bulk PDF upload
          </h1>
          <p className="mt-2 text-[var(--ec-text-secondary)]">
            Upload a ZIP of Cambridge past papers. Years and subjects extracted
            automatically.
          </p>
        </div>

        <div className="space-y-6">
          {/* Board / storage prefix */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-1 text-lg font-semibold text-slate-900">Board</h2>
            <p className="mb-4 text-sm text-[var(--ec-text-secondary)]">
              Choose where PDFs are stored in Supabase (`paper-pdfs` bucket).
            </p>
            <div className="flex flex-wrap gap-3">
              {STORAGE_BOARDS.map((board) => {
                const checked = storagePrefix === board.id
                return (
                  <label
                    key={board.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all ${
                      checked
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="storage-board"
                      checked={checked}
                      onChange={() => setStoragePrefix(board.id)}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    {board.label}
                  </label>
                )
              })}
            </div>
          </div>

          {/* Year filter */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-1 text-lg font-semibold text-slate-900">Year filter</h2>
            <p className="mb-4 text-sm text-[var(--ec-text-secondary)]">
              Only papers from selected years will be uploaded.
            </p>
            <div className="flex flex-wrap gap-3">
              {AVAILABLE_YEARS.map((year) => {
                const checked = selectedYears.has(year)
                return (
                  <label
                    key={year}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all ${
                      checked
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleYear(year)}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    {year}
                  </label>
                )
              })}
            </div>
          </div>

          {/* ZIP picker */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-1 text-lg font-semibold text-slate-900">ZIP archive</h2>
            <p className="mb-4 text-sm text-[var(--ec-text-secondary)]">
              Select a single .zip file. PDFs in any sub-folder are detected.
            </p>
            <label
              htmlFor="zip-input"
              className="block w-full cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-8 text-center transition-all hover:border-emerald-400 hover:bg-emerald-50/30"
            >
              <FileArchive className="mx-auto mb-3 h-8 w-8 text-[var(--ec-text-secondary)]" />
              <div className="font-medium text-slate-700">
                {hasZipFile ? zipFileName : 'Click to select a ZIP'}
              </div>
              <div className="mt-1 text-xs text-[var(--ec-text-secondary)]">
                {hasZipFile ? formatBytes(zipFileSize) : '.zip only'}
              </div>
              <input
                id="zip-input"
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                onChange={(e) => handleZipChange(e.target.files?.[0])}
                className="hidden"
              />
            </label>

            <div className="mt-4">
              <button
                type="button"
                onClick={handleScan}
                disabled={!scanReady}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-medium text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {scanning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  'Scan ZIP'
                )}
              </button>
            </div>

            {scanError && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                <p className="text-sm text-red-800">{scanError}</p>
              </div>
            )}
          </div>

          {/* Scan results */}
          {hasScanResult && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Scan results
              </h2>

              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-[var(--ec-text-secondary)]">
                    PDFs in archive
                  </div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">
                    {scanResult.totalPdfs}
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                    Will be uploaded
                  </div>
                  <div className="mt-1 text-2xl font-bold text-emerald-900">
                    {entriesToUpload.length}
                  </div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-amber-700">
                    Skipped
                  </div>
                  <div className="mt-1 text-2xl font-bold text-amber-900">
                    {scanResult.invalidEntries.length + yearFilteredOut}
                  </div>
                </div>
              </div>

              {Object.keys(scanResult.yearBreakdown).length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-semibold text-slate-900">
                    By year
                  </h3>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {Object.entries(scanResult.yearBreakdown)
                      .sort(([a], [b]) => Number(b) - Number(a))
                      .map(([year, count]) => {
                        const yearNum = Number(year)
                        const included = selectedYears.has(yearNum)
                        return (
                          <span
                            key={year}
                            className={`rounded-lg border px-3 py-1 ${
                              included
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                : 'border-slate-200 bg-slate-50 text-[var(--ec-text-secondary)] line-through'
                            }`}
                          >
                            {year}: {count} PDFs
                          </span>
                        )
                      })}
                  </div>
                </div>
              )}

              {Object.keys(scanResult.subjectBreakdown).length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-semibold text-slate-900">
                    By subject
                  </h3>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {Object.entries(scanResult.subjectBreakdown)
                      .sort(([, a], [, b]) => b - a)
                      .map(([subj, count]) => (
                        <span
                          key={subj}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700"
                        >
                          {subj}: {count} PDFs
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {scanResult.invalidEntries.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-semibold text-slate-900">
                    Will skip — unrecognized filenames ({scanResult.invalidEntries.length})
                  </h3>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-[var(--ec-text-secondary)]">
                    {scanResult.invalidEntries.slice(0, 50).map((e) => (
                      <div key={e.zipPath} className="truncate">
                        {e.basename}{' '}
                        <span className="text-[var(--ec-text-secondary)]">
                          ({e.parsed.valid ? '' : e.parsed.reason})
                        </span>
                      </div>
                    ))}
                    {scanResult.invalidEntries.length > 50 && (
                      <div className="mt-1 text-[var(--ec-text-secondary)]">
                        ...and {scanResult.invalidEntries.length - 50} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {yearFilteredOut > 0 && (
                <p className="text-sm text-[var(--ec-text-secondary)]">
                  {yearFilteredOut} additional PDFs skipped because their year is
                  not in your filter.
                </p>
              )}
            </div>
          )}

          {/* Upload trigger */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-1 text-lg font-semibold text-slate-900">Upload</h2>
            <p className="mb-4 text-sm text-[var(--ec-text-secondary)]">
              Uploads run in parallel ({UPLOAD_CONCURRENCY} at a time) directly from
              your browser to Supabase Storage. Existing files at the same path will
              be overwritten.
            </p>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!uploadReady}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3 font-semibold text-white transition-all hover:from-emerald-600 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading {progress.done}/{progress.total}...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {hasScanResult
                    ? `Start upload (${entriesToUpload.length} files)`
                    : 'Scan ZIP first'}
                </>
              )}
            </button>
          </div>

          {/* Upload progress */}
          {(uploading || uploadDone) && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Upload progress
              </h2>

              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">
                    {progress.done} of {progress.total} uploaded
                  </span>
                  <span className="text-[var(--ec-text-secondary)]">{progressPct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {currentFile && uploading && (
                <p className="mb-4 truncate text-xs text-[var(--ec-text-secondary)]">
                  Current: {currentFile}
                </p>
              )}

              <div className="mb-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                    Uploaded
                  </div>
                  <div className="mt-1 text-xl font-bold text-emerald-900">
                    {uploadSummary.uploaded}
                  </div>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-red-700">
                    Failed
                  </div>
                  <div className="mt-1 text-xl font-bold text-red-900">
                    {uploadSummary.failed}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-[var(--ec-text-secondary)]">
                    Skipped
                  </div>
                  <div className="mt-1 text-xl font-bold text-slate-900">
                    {uploadSummary.skipped}
                  </div>
                </div>
              </div>

              {uploadLog.length > 0 && (
                <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs">
                  {uploadLog.map((entry, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2 ${
                        entry.level === 'error'
                          ? 'text-red-700'
                          : entry.level === 'success'
                          ? 'text-emerald-700'
                          : 'text-[var(--ec-text-secondary)]'
                      }`}
                    >
                      {entry.level === 'success' ? (
                        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
                      ) : entry.level === 'error' ? (
                        <XCircle className="mt-0.5 h-3 w-3 shrink-0" />
                      ) : (
                        <span className="mt-0.5 h-3 w-3 shrink-0" />
                      )}
                      <span className="truncate">{entry.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {uploadDone && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                  <p className="text-sm text-emerald-900">
                    Done. Uploaded: <strong>{uploadSummary.uploaded}</strong>.
                    Failed: <strong>{uploadSummary.failed}</strong>. Skipped:{' '}
                    <strong>{uploadSummary.skipped}</strong>.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
