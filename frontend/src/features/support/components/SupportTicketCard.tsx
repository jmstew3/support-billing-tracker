/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { MoreVertical, Trash2, ExternalLink, MessageCircle, Ticket, Mail, Phone, Clipboard, Lock, Pencil } from 'lucide-react'
import { UrgencyBadge } from '../../../components/ui/UrgencyBadge'
import type { ChatRequest } from '../../../types/request'
import { getDayOfWeek } from '../../../utils/supportHelpers'

interface SupportTicketCardProps {
  request: ChatRequest
  index: number
  isSelected: boolean
  categoryOptions: string[]
  urgencyOptions: string[]
  onSelectRequest: (index: number, event: React.ChangeEvent<HTMLInputElement>) => void
  onUpdateRequest: (index: number, field: string, value: any) => void
  onDeleteRequest: (index: number) => void
  formatTime: (time: string) => string
}

const SourceIcon = ({ source }: { source?: string }) => {
  switch (source) {
    case 'ticket':
      return <Ticket className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
    case 'fluent':
      return <Clipboard className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
    case 'email':
      return <Mail className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
    case 'phone':
      return <Phone className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
    default:
      return <MessageCircle className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
  }
}

const sourceLabel = (source?: string) => {
  switch (source) {
    case 'ticket': return 'Twenty CRM'
    case 'fluent': return 'FluentSupport'
    case 'email': return 'Email'
    case 'phone': return 'Phone'
    case 'sms': return 'Text'
    default: return 'Text'
  }
}

export function SupportTicketCard({
  request,
  index,
  isSelected,
  categoryOptions,
  urgencyOptions,
  onSelectRequest,
  onUpdateRequest,
  onDeleteRequest,
  formatTime,
}: SupportTicketCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)

  const isNonBillable = request.Category === 'Non-billable' || request.Category === 'Migration'
  const isBillingLocked = request.invoice_status != null && request.invoice_status !== 'draft'
  const dateStr = request.Date.includes('T') ? request.Date.split('T')[0] : request.Date

  const linkUrl = request.website_url
    ? request.website_url
    : request.source === 'fluent' && request.fluent_id
      ? `https://support.peakonedigital.com/wp-admin/admin.php?page=fluent-support#/tickets/${request.fluent_id}/view`
      : null

  return (
    <div
      className={`rounded-lg border border-border/50 bg-card p-4 space-y-3 transition-colors ${
        isNonBillable ? 'opacity-60 bg-muted/30 border-border/30' : ''
      } ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
    >
      {/* Top row: checkbox, source + ticket#, urgency badge, menu */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelectRequest(index, e)}
            className="rounded border-border focus:ring-blue-500 shrink-0"
          />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <SourceIcon source={request.source} />
            <span>{sourceLabel(request.source)}</span>
          </div>
          {request.ticket_number && (
            <span className="text-xs text-muted-foreground/70">#{request.ticket_number}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isNonBillable && (
            <UrgencyBadge urgency={request.Urgency} />
          )}
          {/* Three-dot menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 hover:bg-muted rounded transition-colors"
              aria-label="More actions"
            >
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-md border border-border bg-popover shadow-md py-1">
                  <button
                    onClick={() => {
                      setEditingField('Category')
                      setMenuOpen(false)
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit Category
                  </button>
                  {!isNonBillable && (
                    <>
                      <button
                        onClick={() => {
                          if (!isBillingLocked) {
                            setEditingField('Urgency')
                            setMenuOpen(false)
                          }
                        }}
                        disabled={isBillingLocked}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit Urgency
                      </button>
                      <button
                        onClick={() => {
                          if (!isBillingLocked) {
                            setEditingField('EstimatedHours')
                            setMenuOpen(false)
                          }
                        }}
                        disabled={isBillingLocked}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit Hours
                      </button>
                    </>
                  )}
                  <div className="border-t border-border my-1" />
                  <button
                    onClick={() => {
                      onDeleteRequest(index)
                      setMenuOpen(false)
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-muted transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Archive
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Request Summary */}
      <p className={`text-sm leading-relaxed ${isNonBillable ? 'text-muted-foreground' : 'text-foreground'}`}>
        {request.Request_Summary}
      </p>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
        <span title={getDayOfWeek(request.Date)}>{dateStr}</span>
        <span className="text-border">|</span>
        <span>{formatTime(request.Time)}</span>
        <span className="text-border">|</span>
        <span className="inline-flex items-center px-1.5 py-0.5 bg-muted rounded text-[11px] font-medium">
          {request.Category || 'Support'}
        </span>
        {!isNonBillable && (
          <>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1 font-medium text-foreground">
              {(request.EstimatedHours ?? 0.5).toFixed(2)}h
              {isBillingLocked && <Lock className="h-3 w-3 text-amber-500" />}
            </span>
          </>
        )}
      </div>

      {/* Link to ticket + inline editing */}
      {linkUrl && !editingField && (
        <div className="pt-2 border-t border-border/50">
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            <ExternalLink className="h-3 w-3" /> View Ticket
          </a>
        </div>
      )}

      {/* Inline editing overlays */}
      {editingField === 'Category' && (
        <InlineSelect
          label="Category"
          value={request.Category || 'Support'}
          options={categoryOptions}
          onSave={(val) => {
            onUpdateRequest(index, 'Category', val)
            setEditingField(null)
          }}
          onCancel={() => setEditingField(null)}
        />
      )}
      {editingField === 'Urgency' && (
        <InlineSelect
          label="Urgency"
          value={request.Urgency}
          options={urgencyOptions}
          onSave={(val) => {
            onUpdateRequest(index, 'Urgency', val)
            setEditingField(null)
          }}
          onCancel={() => setEditingField(null)}
        />
      )}
      {editingField === 'EstimatedHours' && (
        <InlineNumberInput
          label="Hours"
          value={request.EstimatedHours ?? 0.5}
          onSave={(val) => {
            onUpdateRequest(index, 'EstimatedHours', val)
            setEditingField(null)
          }}
          onCancel={() => setEditingField(null)}
        />
      )}
    </div>
  )
}

// Inline select for mobile editing
function InlineSelect({
  label,
  value,
  options,
  onSave,
  onCancel,
}: {
  label: string
  value: string
  options: string[]
  onSave: (val: string) => void
  onCancel: () => void
}) {
  const [selected, setSelected] = useState(value)

  return (
    <div className="flex items-center gap-2 pt-3 border-t border-border/50">
      <label className="text-xs font-medium text-muted-foreground shrink-0">{label}:</label>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="flex-1 text-sm border border-border rounded-md px-2.5 py-1.5 bg-background"
        autoFocus
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <button
        onClick={() => onSave(selected)}
        className="text-xs font-medium text-primary px-3 py-1.5 bg-primary/10 rounded-md hover:bg-primary/20 transition-colors"
      >
        Save
      </button>
      <button
        onClick={onCancel}
        className="text-xs text-muted-foreground px-2 py-1.5"
      >
        Cancel
      </button>
    </div>
  )
}

// Inline number input for mobile editing
function InlineNumberInput({
  label,
  value,
  onSave,
  onCancel,
}: {
  label: string
  value: number
  onSave: (val: number) => void
  onCancel: () => void
}) {
  const [editValue, setEditValue] = useState(value.toFixed(2))

  const handleSave = () => {
    const num = parseFloat(editValue)
    if (!isNaN(num) && num >= 0 && num <= 99.99) {
      const rounded = Math.round(num / 0.25) * 0.25
      onSave(rounded)
    } else {
      onCancel()
    }
  }

  return (
    <div className="flex items-center gap-2 pt-3 border-t border-border/50">
      <label className="text-xs font-medium text-muted-foreground shrink-0">{label}:</label>
      <input
        type="number"
        step="0.25"
        min="0"
        max="99.99"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') onCancel()
        }}
        className="w-20 text-sm border border-border rounded-md px-2.5 py-1.5 bg-background"
        autoFocus
      />
      <button
        onClick={handleSave}
        className="text-xs font-medium text-primary px-3 py-1.5 bg-primary/10 rounded-md hover:bg-primary/20 transition-colors"
      >
        Save
      </button>
      <button
        onClick={onCancel}
        className="text-xs text-muted-foreground px-2 py-1.5"
      >
        Cancel
      </button>
    </div>
  )
}
