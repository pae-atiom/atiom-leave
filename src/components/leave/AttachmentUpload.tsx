import { useRef } from 'react'
import { FileText, Paperclip, X } from 'lucide-react'
import type { Attachment, AttachmentMime } from '#/types'
import { generateId, nowIso } from '#/lib/utils'

const ACCEPT = '.pdf,.jpg,.jpeg,.png'
const MIME_OK = new Set<string>(['application/pdf', 'image/jpeg', 'image/png'])

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/**
 * Mocked upload: we keep only file metadata (name/size/mime), never the binary.
 * This satisfies the POC's "attach a document" flow without real storage.
 */
export function AttachmentUpload({
  attachments,
  onChange,
}: {
  attachments: Attachment[]
  onChange: (next: Attachment[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(files: FileList | null) {
    if (!files) return
    const added: Attachment[] = []
    for (const file of Array.from(files)) {
      if (!MIME_OK.has(file.type)) continue
      added.push({
        id: generateId('att'),
        filename: file.name,
        mimeType: file.type as AttachmentMime,
        sizeBytes: file.size,
        uploadedAt: nowIso(),
        mockDataUrl: null,
      })
    }
    if (added.length) onChange([...attachments, ...added])
    if (inputRef.current) inputRef.current.value = ''
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
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500 hover:border-brand-400 hover:text-brand-600"
      >
        <Paperclip className="size-4" />
        Attach a document (PDF, JPG, PNG)
      </button>

      {attachments.length > 0 && (
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
        </ul>
      )}
    </div>
  )
}
