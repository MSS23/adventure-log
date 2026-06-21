'use client'

import { useState, type KeyboardEvent } from 'react'
import { Plus, X, ListChecks } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ChecklistItem } from '@/lib/hooks/useWishlist'

const MAX_ITEMS = 50
const MAX_LEN = 200

interface ChecklistEditorProps {
  value: ChecklistItem[]
  onChange: (items: ChecklistItem[]) => void
}

export function ChecklistEditor({ value, onChange }: ChecklistEditorProps) {
  const [draft, setDraft] = useState('')

  const addItem = () => {
    const text = draft.trim().slice(0, MAX_LEN)
    if (!text || value.length >= MAX_ITEMS) return
    onChange([...value, { id: crypto.randomUUID(), text, done: false }])
    setDraft('')
  }

  const toggle = (id: string) =>
    onChange(value.map((i) => (i.id === id ? { ...i, done: !i.done } : i)))

  const remove = (id: string) => onChange(value.filter((i) => i.id !== id))

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addItem()
    }
  }

  const doneCount = value.filter((i) => i.done).length

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-primary" />
        Things to do / see
        {value.length > 0 && (
          <span className="text-xs font-normal text-muted-foreground">
            {doneCount}/{value.length}
          </span>
        )}
      </label>

      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2"
            >
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggle(item.id)}
                className="h-4 w-4 shrink-0 rounded border-border accent-[color:var(--color-primary)] cursor-pointer"
                aria-label={`Mark "${item.text}" as ${item.done ? 'not done' : 'done'}`}
              />
              <span
                className={cn(
                  'flex-1 text-sm text-foreground break-words',
                  item.done && 'line-through text-muted-foreground'
                )}
              >
                {item.text}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(item.id)}
                className="h-7 w-7 p-0 rounded-lg shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                aria-label={`Remove "${item.text}"`}
                title="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {value.length < MAX_ITEMS && (
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a restaurant, sight, activity…"
            maxLength={MAX_LEN}
            className="rounded-xl"
          />
          <Button
            type="button"
            variant="outline"
            onClick={addItem}
            disabled={!draft.trim()}
            className="shrink-0 rounded-xl gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      )}
    </div>
  )
}
