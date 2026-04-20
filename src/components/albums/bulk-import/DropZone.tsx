'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Upload, FileImage, MapPin, FolderPlus, Globe2 } from 'lucide-react'

interface DropZoneProps {
  getRootProps: () => Record<string, unknown>
  getInputProps: () => Record<string, unknown>
  isDragActive: boolean
  maxPhotos: number
}

export function DropZone({
  getRootProps,
  getInputProps,
  isDragActive,
  maxPhotos,
}: DropZoneProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div
        {...getRootProps()}
        className={cn(
          'rounded-2xl p-12 md:p-16 text-center cursor-pointer transition-all duration-300'
        )}
        style={{
          background: isDragActive ? 'var(--color-coral-tint)' : 'var(--card)',
          border: `2px dashed ${
            isDragActive ? 'var(--color-coral)' : 'var(--color-line-warm)'
          }`,
          transform: isDragActive ? 'scale(1.01)' : undefined,
        }}
      >
        <input {...getInputProps()} />
        <motion.div
          animate={isDragActive ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div
            className="w-14 h-14 mx-auto mb-5 rounded-2xl flex items-center justify-center"
            style={{
              background: 'var(--color-coral-tint)',
              color: 'var(--color-coral)',
            }}
          >
            <Upload className="h-6 w-6" strokeWidth={1.8} />
          </div>
        </motion.div>

        {isDragActive ? (
          <p
            className="font-heading text-xl font-semibold"
            style={{ color: 'var(--color-coral)' }}
          >
            Drop your photos here
          </p>
        ) : (
          <div>
            <p
              className="font-heading text-xl md:text-2xl font-semibold mb-1"
              style={{ color: 'var(--color-ink)', letterSpacing: '-0.01em' }}
            >
              Drop photos or tap to upload
            </p>
            <p
              className="text-[13px] mb-5"
              style={{ color: 'var(--color-muted-warm)' }}
            >
              We&apos;ll read EXIF, GPS and dates automatically
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Chip icon={<FileImage className="h-3 w-3" />} label="JPG · PNG · WebP" />
              <Chip icon={<Upload className="h-3 w-3" />} label={`Up to ${maxPhotos} photos`} />
              <Chip icon={<MapPin className="h-3 w-3" />} label="Auto GPS" />
              <Chip icon={<FolderPlus className="h-3 w-3" />} label="Smart grouping" />
            </div>
          </div>
        )}
      </div>

      {/* How it works — editorial 3-column */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          {
            icon: Upload,
            title: 'Drop photos',
            desc: 'Select up to 200 photos from camera roll or file system.',
          },
          {
            icon: Globe2,
            title: 'Auto-group',
            desc: 'Photos cluster by date and GPS into trip-sized albums.',
          },
          {
            icon: FolderPlus,
            title: 'Create albums',
            desc: 'Review groups, rename, upload — albums created automatically.',
          },
        ].map((step, i) => (
          <div
            key={i}
            className="p-4 rounded-xl"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--color-line-warm)',
            }}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'var(--color-ivory-alt)',
                  color: 'var(--color-coral)',
                }}
              >
                <step.icon className="h-4 w-4" />
              </div>
              <p className="al-eyebrow">Step {i + 1}</p>
            </div>
            <h3
              className="font-heading text-[15px] font-semibold mb-1"
              style={{ color: 'var(--color-ink)' }}
            >
              {step.title}
            </h3>
            <p
              className="text-[13px] leading-relaxed"
              style={{ color: 'var(--color-muted-warm)' }}
            >
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px] font-semibold tracking-wide uppercase"
      style={{
        background: 'var(--color-ivory-alt)',
        color: 'var(--color-ink-soft)',
        border: '1px solid var(--color-line-warm)',
      }}
    >
      {icon}
      {label}
    </span>
  )
}
