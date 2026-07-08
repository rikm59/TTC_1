import { useState, useRef } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { Search, Upload, ExternalLink, Loader2, X, TrendingDown, FlaskConical } from 'lucide-react'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase'

const RETAILERS_NOTE =
  "Sephora, Ulta, Nordstrom, Macy's, FragranceX, FragranceNet, Notino, Perfumania, Jomashop, Amazon, Walmart, Target, and official brand sites"

type RetailerResult = {
  retailer: string
  price: string
  size?: string
  url?: string
  inStock?: boolean
}

type SearchResult = {
  brand: string
  name: string
  concentration?: string
  size?: string
  notes?: string
  results: RetailerResult[]
}

type ImageData = { base64: string; mediaType: string; previewUrl: string }

export default function FragrancePriceFinder() {
  const [mode, setMode] = useState<'name' | 'photo'>('name')
  const [query, setQuery] = useState('')
  const [photoName, setPhotoName] = useState('')
  const [imageData, setImageData] = useState<ImageData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SearchResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File | null | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name || '')) {
      setError('Please upload an image file.')
      return
    }
    setError(null)

    const reader = new FileReader()
    reader.onload = () => {
      const rawDataUrl = reader.result as string
      const img = new Image()
      img.onload = () => {
        try {
          // Downscale to keep the request small and normalize the format to JPEG
          // (phone photos are often HEIC, which the API can't read, and can be huge).
          const maxDim = 1024
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
          const w = Math.max(1, Math.round(img.width * scale))
          const h = Math.max(1, Math.round(img.height * scale))

          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')!
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, w, h)
          ctx.drawImage(img, 0, 0, w, h)

          const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.85)
          const base64 = jpegDataUrl.split(',')[1]
          setImageData({ base64, mediaType: 'image/jpeg', previewUrl: jpegDataUrl })
        } catch {
          setError('Could not process that image. Try a different photo (JPEG or PNG works best).')
        }
      }
      img.onerror = () => {
        setError(
          "Could not open that image — if it's a HEIC/live photo from an iPhone, try saving it as JPEG first, or take a screenshot of it instead."
        )
      }
      img.src = rawDataUrl
    }
    reader.onerror = () => setError('Could not read that image.')
    reader.readAsDataURL(file)
  }

  async function runSearch() {
    setError(null)
    setResult(null)

    if (mode === 'name' && !query.trim()) {
      setError('Enter a fragrance name first.')
      return
    }
    if (mode === 'photo' && !imageData) {
      setError('Upload a photo of the bottle or box first.')
      return
    }
    if (mode === 'photo' && !photoName.trim()) {
      setError("This environment can't auto-read photos — type the brand + name from the label below, then search.")
      return
    }

    setLoading(true)
    try {
      const searchName = mode === 'photo' ? photoName.trim() : query.trim()

      let response: Response
      try {
        response = await fetch(`${SUPABASE_URL}/functions/v1/fragrance-price-search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ query: searchName }),
        })
      } catch (networkErr) {
        const e = networkErr as Error
        throw new Error(`[Step: price search — network] ${e?.name || 'Error'}: ${e?.message || String(networkErr)}`)
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(`[Step: price search] ${data?.error || `HTTP ${response.status}`}${data?.detail ? ` — ${data.detail}` : ''}`)
      }

      const parsed = data as SearchResult

      const sorted = [...(parsed.results || [])].sort((a, b) => {
        const pa = parseFloat(String(a.price).replace(/[^0-9.]/g, '')) || Infinity
        const pb = parseFloat(String(b.price).replace(/[^0-9.]/g, '')) || Infinity
        return pa - pb
      })

      setResult({ ...parsed, results: sorted })
    } catch (e) {
      setError((e as Error).message || 'Something went wrong during the search.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        input:focus, button:focus, .dropzone:focus-within { outline: 2px solid #C08A4E; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) {
          .fillAnim { animation: none !important; }
        }
        @keyframes fillBottle {
          0% { height: 4%; }
          50% { height: 85%; }
          100% { height: 40%; }
        }
        @keyframes drift {
          0%, 100% { transform: translateY(0px); opacity: 0.6; }
          50% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>

      <div style={styles.container}>
        <div style={styles.eyebrow}>FRAGRANCE PRICE FINDER</div>
        <h1 style={styles.headline}>
          Find it, <span style={{ color: '#C08A4E', fontStyle: 'italic' }}>for less.</span>
        </h1>
        <p style={styles.sub}>
          Search by name, or upload a photo for reference and type what's on the label. We'll check {RETAILERS_NOTE} for the lowest current price.
        </p>

        <div style={styles.card}>
          <div style={styles.tabRow}>
            <button
              onClick={() => setMode('name')}
              style={{ ...styles.tab, ...(mode === 'name' ? styles.tabActive : {}) }}
            >
              <Search size={15} style={{ marginRight: 6 }} />
              By name
            </button>
            <button
              onClick={() => setMode('photo')}
              style={{ ...styles.tab, ...(mode === 'photo' ? styles.tabActive : {}) }}
            >
              <Upload size={15} style={{ marginRight: 6 }} />
              By photo
            </button>
          </div>

          {mode === 'name' ? (
            <input
              style={styles.input}
              placeholder="e.g. Chanel Bleu de Chanel EDP 100ml"
              value={query}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            />
          ) : (
            <div
              className="dropzone"
              style={styles.dropzone}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e: DragEvent<HTMLDivElement>) => e.preventDefault()}
              onDrop={(e: DragEvent<HTMLDivElement>) => {
                e.preventDefault()
                handleFile(e.dataTransfer.files?.[0])
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e: ChangeEvent<HTMLInputElement>) => handleFile(e.target.files?.[0])}
              />
              {imageData ? (
                <div style={styles.previewWrap}>
                  <img src={imageData.previewUrl} alt="Uploaded fragrance" style={styles.previewImg} />
                  <button
                    style={styles.removeBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      setImageData(null)
                      setPhotoName('')
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#8FA9B8' }}>
                  <Upload size={22} style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 14 }}>Drop a photo here, or click to browse</div>
                </div>
              )}
            </div>
          )}

          {mode === 'photo' && imageData && (
            <>
              <div style={styles.photoNote}>
                This tool can't auto-read the label — type what's on the bottle/box below.
              </div>
              <input
                style={styles.input}
                placeholder="e.g. Ferragamo Signorina EDP 100ml"
                value={photoName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPhotoName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              />
            </>
          )}

          <button style={styles.submit} onClick={runSearch} disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={16} className="fillAnim" style={{ marginRight: 8, animation: 'spin 1s linear infinite' }} />
                Searching retailers…
              </>
            ) : (
              'Find lowest price'
            )}
          </button>

          {error && <div style={styles.errorBox}>{error}</div>}
        </div>

        {loading && (
          <div style={styles.loadingScene}>
            <div style={styles.bottleOutline}>
              <div className="fillAnim" style={{ ...styles.bottleFill, animation: 'fillBottle 1.8s ease-in-out infinite' }} />
            </div>
            <div style={{ color: '#8FA9B8', fontSize: 13, letterSpacing: '0.04em' }}>
              Identifying and comparing prices…
            </div>
          </div>
        )}

        {result && (
          <div style={styles.resultsWrap}>
            <div style={styles.idBlock}>
              <FlaskConical size={18} color="#C08A4E" />
              <div>
                <div style={styles.idBrand}>{result.brand}</div>
                <div style={styles.idName}>
                  {result.name}
                  {result.concentration ? ` · ${result.concentration}` : ''}
                  {result.size ? ` · ${result.size}` : ''}
                </div>
              </div>
            </div>

            {result.notes && <div style={styles.notes}>{result.notes}</div>}

            <div style={styles.resultsList}>
              {(result.results || []).map((r, i) => (
                <div key={i} style={{ ...styles.row, ...(i === 0 ? styles.rowLowest : {}) }}>
                  <div style={styles.rowLine} />
                  <div style={styles.rowMain}>
                    <div>
                      <div style={styles.retailer}>
                        {r.retailer}
                        {i === 0 && (
                          <span style={styles.badge}>
                            <TrendingDown size={11} style={{ marginRight: 4 }} />
                            Lowest
                          </span>
                        )}
                      </div>
                      {r.size && <div style={styles.rowSize}>{r.size}</div>}
                      {r.inStock === false && <div style={styles.oos}>Out of stock</div>}
                    </div>
                    <div style={styles.priceRow}>
                      <span style={styles.price}>{r.price}</span>
                      {r.url && (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" style={styles.viewLink}>
                          View <ExternalLink size={12} style={{ marginLeft: 4 }} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.disclaimer}>
              Prices change constantly — verify at the retailer before buying. Only authorized retailers are shown; resale and third-party marketplace listings are excluded.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#14151A',
    color: '#F3EEE4',
    fontFamily: "'Inter', sans-serif",
    padding: '48px 20px 80px',
  },
  container: { maxWidth: 560, margin: '0 auto' },
  eyebrow: {
    fontSize: 12,
    letterSpacing: '0.18em',
    color: '#8FA9B8',
    fontWeight: 600,
    marginBottom: 14,
  },
  headline: {
    fontFamily: "'Fraunces', serif",
    fontSize: 'clamp(32px, 6vw, 48px)',
    fontWeight: 600,
    lineHeight: 1.1,
    margin: '0 0 14px',
  },
  sub: {
    color: 'rgba(243,238,228,0.65)',
    fontSize: 15,
    lineHeight: 1.5,
    marginBottom: 32,
    maxWidth: 460,
  },
  card: {
    background: 'rgba(243,238,228,0.04)',
    border: '1px solid rgba(243,238,228,0.12)',
    borderRadius: 14,
    padding: 20,
  },
  tabRow: { display: 'flex', gap: 8, marginBottom: 16 },
  tab: {
    display: 'flex',
    alignItems: 'center',
    background: 'transparent',
    border: '1px solid rgba(243,238,228,0.14)',
    color: 'rgba(243,238,228,0.6)',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  tabActive: {
    background: 'rgba(192,138,78,0.14)',
    borderColor: '#C08A4E',
    color: '#F3EEE4',
  },
  input: {
    width: '100%',
    background: 'rgba(0,0,0,0.2)',
    border: '1px solid rgba(243,238,228,0.14)',
    borderRadius: 8,
    padding: '12px 14px',
    color: '#F3EEE4',
    fontSize: 15,
    fontFamily: 'inherit',
    marginBottom: 14,
  },
  photoNote: {
    fontSize: 12.5,
    color: '#8FA9B8',
    marginBottom: 10,
    lineHeight: 1.4,
  },
  dropzone: {
    border: '1.5px dashed rgba(143,169,184,0.4)',
    borderRadius: 10,
    padding: 22,
    marginBottom: 14,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
  },
  previewWrap: { position: 'relative' },
  previewImg: { maxHeight: 140, borderRadius: 8, display: 'block' },
  removeBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    background: '#14151A',
    border: '1px solid rgba(243,238,228,0.3)',
    borderRadius: '50%',
    width: 24,
    height: 24,
    color: '#F3EEE4',
    cursor: 'pointer',
  },
  submit: {
    width: '100%',
    background: '#C08A4E',
    color: '#14151A',
    border: 'none',
    borderRadius: 8,
    padding: '13px 16px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'inherit',
  },
  errorBox: {
    marginTop: 12,
    color: '#e5a3a3',
    fontSize: 12.5,
    fontFamily: 'monospace',
    background: 'rgba(229,163,163,0.08)',
    border: '1px solid rgba(229,163,163,0.25)',
    borderRadius: 8,
    padding: '10px 12px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  loadingScene: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
    marginTop: 36,
  },
  bottleOutline: {
    width: 34,
    height: 60,
    border: '2px solid rgba(143,169,184,0.5)',
    borderRadius: '6px 6px 10px 10px',
    display: 'flex',
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  bottleFill: { width: '100%', background: 'linear-gradient(180deg, #C08A4E, #8FA9B8)' },
  resultsWrap: { marginTop: 36 },
  idBlock: { display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 },
  idBrand: { fontSize: 13, color: '#8FA9B8', letterSpacing: '0.04em', textTransform: 'uppercase' },
  idName: { fontFamily: "'Fraunces', serif", fontSize: 22, marginTop: 2 },
  notes: {
    fontSize: 13,
    color: 'rgba(243,238,228,0.55)',
    marginBottom: 18,
    fontStyle: 'italic',
  },
  resultsList: { display: 'flex', flexDirection: 'column' },
  row: { position: 'relative', paddingLeft: 20, paddingBottom: 18 },
  rowLowest: {},
  rowLine: {
    position: 'absolute',
    left: 5,
    top: 6,
    bottom: 0,
    width: 1,
    background: 'rgba(243,238,228,0.14)',
  },
  rowMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid rgba(243,238,228,0.08)',
    paddingBottom: 16,
    width: '100%',
  },
  retailer: { fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center' },
  rowSize: { fontSize: 12, color: 'rgba(243,238,228,0.5)', marginTop: 3 },
  oos: { fontSize: 11, color: '#e5a3a3', marginTop: 3 },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    marginLeft: 8,
    fontSize: 10,
    fontWeight: 700,
    color: '#14151A',
    background: '#C08A4E',
    borderRadius: 20,
    padding: '2px 8px',
    letterSpacing: '0.03em',
  },
  priceRow: { textAlign: 'right' },
  price: { fontFamily: "'Fraunces', serif", fontSize: 20, display: 'block' },
  viewLink: {
    fontSize: 12,
    color: '#8FA9B8',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    marginTop: 4,
  },
  disclaimer: {
    fontSize: 12,
    color: 'rgba(243,238,228,0.4)',
    marginTop: 8,
    lineHeight: 1.5,
  },
}
