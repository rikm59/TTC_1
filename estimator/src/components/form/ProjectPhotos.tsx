import { useRef, useState } from 'react'
import { Camera, Upload, X, ImageIcon, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

interface Props {
  estimateId: string
  photos: string[]
  onChange: (photos: string[]) => void
}

const MAX_PHOTOS = 20
const MAX_SIZE_MB = 10

export default function ProjectPhotos({ estimateId, photos, onChange }: Props) {
  const { user } = useAuth()
  const cameraRef = useRef<HTMLInputElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const uploadFiles = async (files: FileList | null) => {
    if (!files || !user) return
    setError('')

    const remaining = MAX_PHOTOS - photos.length
    const toUpload = Array.from(files).slice(0, remaining)
    if (toUpload.length === 0) {
      setError(`Maximum ${MAX_PHOTOS} photos allowed.`)
      return
    }

    setUploading(true)
    const newUrls: string[] = []

    for (const file of toUpload) {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`${file.name} exceeds ${MAX_SIZE_MB} MB — skipped.`)
        continue
      }
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${user.id}/estimate-photos/${estimateId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('business-assets')
        .upload(path, file, { upsert: false })
      if (upErr) {
        setError(upErr.message)
        continue
      }
      const { data } = supabase.storage.from('business-assets').getPublicUrl(path)
      newUrls.push(data.publicUrl)
    }

    setUploading(false)
    if (newUrls.length > 0) onChange([...photos, ...newUrls])
  }

  const removePhoto = async (url: string) => {
    // Extract storage path from the public URL
    const marker = '/business-assets/'
    const idx = url.indexOf(marker)
    if (idx !== -1) {
      const path = decodeURIComponent(url.slice(idx + marker.length))
      const { error } = await supabase.storage.from('business-assets').remove([path])
      if (error) console.error('[removePhoto] Storage delete failed:', error.message)
    }
    onChange(photos.filter(p => p !== url))
  }

  const atMax = photos.length >= MAX_PHOTOS

  return (
    <div className="space-y-3">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Camera — capture="environment" opens rear camera on mobile */}
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={uploading || atMax}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          Take Photo
        </button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => uploadFiles(e.target.files)}
        />

        {/* Upload from gallery / files */}
        <button
          type="button"
          onClick={() => uploadRef.current?.click()}
          disabled={uploading || atMax}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-sm font-medium rounded-lg transition"
        >
          <Upload className="w-4 h-4" />
          Upload Photos
        </button>
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => uploadFiles(e.target.files)}
        />

        <span className="text-xs text-gray-400 self-center">
          {photos.length}/{MAX_PHOTOS} photos · max {MAX_SIZE_MB} MB each
        </span>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Thumbnail grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {photos.map((url, i) => (
            <div key={url} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
              <img
                src={url}
                alt={`Project photo ${i + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <button
                type="button"
                onClick={() => removePhoto(url)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs"
                title="Remove photo"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
          <ImageIcon className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-xs">No photos yet — use the buttons above to add project photos</p>
        </div>
      )}
    </div>
  )
}
