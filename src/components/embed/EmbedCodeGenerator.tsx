'use client'

import { useState } from 'react'
import { Copy, Check, Code2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { toast } from 'sonner'

interface EmbedCodeGeneratorProps {
  username: string
}

export function EmbedCodeGenerator({ username }: EmbedCodeGeneratorProps) {
  const [copied, setCopied] = useState(false)
  const [width, setWidth] = useState('100%')
  const [height, setHeight] = useState('500')

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const embedUrl = `${appUrl}/embed/${username}`
  const embedCode = `<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" style="border-radius: 12px; overflow: hidden;" title="${username}'s Travel Map"></iframe>`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(embedCode)
    setCopied(true)
    toast.success('Embed code copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <GlassCard variant="frost" className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Code2 className="h-4 w-4 text-teal-500" />
          <h3 className="font-semibold text-sm text-gray-900">Embed Your Travel Map</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Add your travel map to any website or blog.
        </p>

        {/* Size options */}
        <div className="flex gap-2 mb-3">
          <select
            value={width}
            onChange={e => setWidth(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
          >
            <option value="100%">Full Width</option>
            <option value="600">600px</option>
            <option value="400">400px</option>
          </select>
          <select
            value={height}
            onChange={e => setHeight(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
          >
            <option value="400">Short (400px)</option>
            <option value="500">Medium (500px)</option>
            <option value="600">Tall (600px)</option>
          </select>
        </div>

        {/* Code preview */}
        <div className="bg-slate-900 rounded-lg p-3 mb-3 overflow-x-auto">
          <code className="text-[11px] text-teal-300 whitespace-pre-wrap break-all">
            {embedCode}
          </code>
        </div>

        <Button
          onClick={handleCopy}
          size="sm"
          className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-xs rounded-lg"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 mr-1" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 mr-1" />
              Copy Embed Code
            </>
          )}
        </Button>
      </div>
    </GlassCard>
  )
}
