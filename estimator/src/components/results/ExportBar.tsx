interface Props {
  onPDF: () => void
  onWord: () => void
  onPrint: () => void
  onSave: () => void
  estimateType: 'estimate' | 'invoice'
  activeView: 'contractor' | 'client'
}

export default function ExportBar({ onPDF, onWord, onPrint, onSave, estimateType, activeView }: Props) {
  const label = estimateType === 'invoice' ? 'Invoice' : 'Quote'
  const viewLabel = activeView === 'client' ? 'Client' : 'Contractor'

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-400 mr-1">Export ({viewLabel} View):</span>
      <button onClick={onPDF} className="btn-primary text-xs">
        📄 PDF {label}
      </button>
      <button onClick={onWord} className="btn-secondary text-xs">
        📝 Word Doc
      </button>
      <button onClick={onPrint} className="btn-secondary text-xs">
        🖨️ Print
      </button>
      <button onClick={onSave} className="btn-secondary text-xs ml-auto">
        💾 Save Draft
      </button>
    </div>
  )
}
