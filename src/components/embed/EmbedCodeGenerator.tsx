'use client'

import { useState } from 'react'
import { Copy, Check, Code2, Monitor, Smartphone, Tablet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface EmbedCodeGeneratorProps {
  username: string
  displayName?: string
}

const SIZE_PRESETS = [
  { label: 'Full Width', icon: Monitor, width: '100%', height: '500' },
  { label: 'Medium', icon: Tablet, width: '600', height: '450' },
  { label: 'Compact', icon: Smartphone, width: '400', height: '400' },
] as const

export function EmbedCodeGenerator({ username, displayName }: EmbedCodeGeneratorProps) {
  const [copied, setCopied] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState(0)

  const { width, height } = SIZE_PRESETS[selectedPreset]

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const embedUrl = `${appUrl}/embed/${username}`
  const title = displayName ? `${displayName}'s Travel Map` : `${username}'s Travel Map`
  const embedCode = `<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" style="border-radius: 12px; overflow: hidden;" title="${title}"></iframe>`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(embedCode)
    setCopied(true)
    toast.success('Embed code copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <GlassCard variant="frost" className="overflow-hidden">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-olive-500/10 dark:bg-olive-500/20 flex items-center justify-center">
            <Code2 className="h-3.5 w-3.5 text-olive-600 dark:text-olive-400" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-stone-900 dark:text-stone-100">Embed Travel Globe</h3>
            <p className="text-[11px] text-stone-400 dark:text-stone-500">Add your interactive travel map to any website</p>
          </div>
        </div>

        {/* Size presets */}
        <div className="grid grid-cols-3 gap-2">
          {SIZE_PRESETS.map((preset, i) => {
            const Icon = preset.icon
            return (
              <button
                key={i}
                onClick={() => setSelectedPreset(i)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl px-2 py-2.5 border transition-all duration-200 text-center',
                  selectedPreset === i
                    ? 'bg-olive-50 dark:bg-olive-500/10 border-olive-300 dark:border-olive-500/30 text-olive-700 dark:text-olive-400'
                    : 'bg-white dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[11px] font-medium leading-tight">{preset.label}</span>
                <span className="text-[10px] opacity-60">{preset.width} x {preset.height}</span>
              </button>
            )
          })}
        </div>

        {/* Code preview */}
        <div className="relative bg-stone-900 dark:bg-stone-950 rounded-xl p-3 overflow-x-auto group">
          <code className="text-[11px] text-olive-300/80 whitespace-pre-wrap break-all leading-relaxed font-mono">
            {embedCode}
          </code>
        </div>

        {/* Copy button */}
        <Button
          onClick={handleCopy}
          size="sm"
          className={cn(
            'w-full text-white text-xs rounded-xl transition-all duration-200',
            copied
              ? 'bg-green-600 hover:bg-green-500'
              : 'bg-olive-600 hover:bg-olive-500'
          )}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Copied to Clipboard
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copy Embed Code
            </>
          )}
        </Button>
      </div>
    </GlassCard>
  )
}
