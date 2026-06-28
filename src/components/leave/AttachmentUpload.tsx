import { useRef, useState } from 'react'
import { FileText, Loader2, Paperclip, X } from 'lucide-react'
import type { Attachment, AttachmentMime } from '#/types'
import { api } from '#/lib/api'
import { ApiError } from '#/lib/api'
import { generateId, nowIso } from '#/lib/utils'

const ACCEPT = '.pdf,.jpg,.jpeg,.png'
const MIME_OK = new Set<string>(['application/pdf', 'image/jpeg', 'image/png'])
const MAX_BYTES = 10 * 1024 * 1024

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/**
 * Real upload (Phase 2): for each picked file we request a presigned S3 PUT
 * URL, upload the bytes straight to S3 (the API never proxies the file), and
 * persist the returned object key on the Attachment.
 */
export function AttachmentUpload({
  attachments,
  onChange,
}: {
  attachments: Attachment[]
  onChange: (next: Attachment[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState<string[]>([]) // filenames in flight
  const [error, setError] = useState<string | null>(null)

  async function uploadOne(file: File): Promise<Attachment> {
    const mimeType = file.type as AttachmentMime
    const { key, url } = await api.attachments.presign({
      filename: file.name,
      mimeType,
      sizeBytes: file.size,
    })
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
      body: file,
    })
    if (!res.ok) throw new Error(`Upload failed (${res.status})`)
    return {
      id: generateId('att'),
      filename: file.name,
      mimeType,
      sizeBytes: file.size,
      uploadedAt: nowIso(),
      storageKey: key,
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return
    setError(null)
    const picked = Array.from(files)
    if (inputRef.current) inputRef.current.value = ''

    const valid = picked.filter((f) => {
      if (!MIME_OK.has(f.type)) {
        setError(`${f.name}: unsupported file type.`)
        return false
      }
      if (f.size > MAX_BYTES) {
        setError(`${f.name}: file exceeds 10 MB.`)
        return false
      }
      return true
    })
    if (valid.length === 0) return

    setUploading((u) => [...u, ...valid.map((f) => f.name)])
    try {
      const added = await Promise.all(valid.map(uploadOne))
      onChange([...attachments, ...added])
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Upload failed.',
      )
    } finally {
      setUploading((u) => u.filter((n) => !valid.some((f) => f.name === n)))
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading.length > 0}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500 hover:border-brand-400 hover:text-brand-600 disabled:opacity-60"
      >
        {uploading.length > 0 ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Paperclip className="size-4" />
        )}
        {uploading.length > 0
          ? `Uploading ${uploading.length} file(s)…`
          : 'Attach a document (PDF, JPG, PNG)'}
      </button>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {(attachments.length > 0 || uploading.length > 0) && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2 text-sm"
            >
              <FileText className="size-4 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1 truncate text-slate-700">
                {a.filename}
              </span>
              <span className="text-xs text-slate-400">
                {formatSize(a.sizeBytes)}
              </span>
              <button
                type="button"
                onClick={() => onChange(attachments.filter((x) => x.id !== a.id))}
                className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                aria-label={`Remove ${a.filename}`}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
          {uploading.map((name) => (
            <li
              key={`uploading-${name}`}
              className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-400"
            >
              <Loader2 className="size-4 shrink-0 animate-spin" />
              <span className="min-w-0 flex-1 truncate">{name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
