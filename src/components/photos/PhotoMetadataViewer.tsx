'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Info,
  Camera,
  MapPin,
  Calendar,
  Clock,
  Aperture,
  Maximize,
  Hash,
  Image as ImageIcon,
  Zap
} from 'lucide-react'
import { Photo } from '@/types/database'
import Image from 'next/image'
import { getPhotoUrl } from '@/lib/utils/photo-url'

interface PhotoMetadataViewerProps {
  photo: Photo
  trigger?: React.ReactNode
}

export function PhotoMetadataViewer({ photo, trigger }: PhotoMetadataViewerProps) {
  const [open, setOpen] = useState(false)

  const photoUrl = getPhotoUrl(photo.file_path || photo.storage_path)
  const exifData = photo.exif_data as Record<string, any> | null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes) return 'N/A'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  }

  const MetadataRow = ({ icon: Icon, label, value }: { icon: any, label: string, value: string | null | undefined }) => {
    if (!value) return null

    return (
      <div className="flex items-start gap-3 py-2">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Icon className="h-4 w-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-sm text-gray-900 font-medium mt-0.5 break-words">{value}</p>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Info className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Photo Details
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Photo Preview */}
          <div className="space-y-4">
            <div className="relative aspect-square w-full bg-gray-100 rounded-lg overflow-hidden">
              {photoUrl && (
                <Image
                  src={photoUrl}
                  alt={photo.caption || 'Photo'}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              )}
            </div>
            {photo.caption && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{photo.caption}</p>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                File Information
              </h3>
              <div className="space-y-1">
                <MetadataRow
                  icon={Hash}
                  label="File Name"
                  value={photo.file_path?.split('/').pop() || 'Unknown'}
                />
                <MetadataRow
                  icon={ImageIcon}
                  label="File Size"
                  value={formatFileSize(photo.file_size)}
                />
                <MetadataRow
                  icon={Calendar}
                  label="Uploaded"
                  value={formatDate(photo.created_at)}
                />
              </div>
            </div>

            {/* Location Data */}
            {(photo.latitude || photo.longitude || photo.location_name) && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </h3>
                <div className="space-y-1">
                  <MetadataRow
                    icon={MapPin}
                    label="Place"
                    value={photo.location_name}
                  />
                  {photo.latitude && photo.longitude && (
                    <MetadataRow
                      icon={MapPin}
                      label="Coordinates"
                      value={`${photo.latitude.toFixed(6)}, ${photo.longitude.toFixed(6)}`}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Camera Settings (EXIF) */}
            {exifData && Object.keys(exifData).length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Camera Settings
                </h3>
                <div className="space-y-1">
                  <MetadataRow
                    icon={Camera}
                    label="Camera"
                    value={[exifData.Make, exifData.Model].filter(Boolean).join(' ') || null}
                  />
                  <MetadataRow
                    icon={Aperture}
                    label="Aperture"
                    value={exifData.FNumber ? `f/${exifData.FNumber}` : null}
                  />
                  <MetadataRow
                    icon={Clock}
                    label="Shutter Speed"
                    value={exifData.ExposureTime ? `${exifData.ExposureTime}s` : null}
                  />
                  <MetadataRow
                    icon={Zap}
                    label="ISO"
                    value={exifData.ISO ? `ISO ${exifData.ISO}` : null}
                  />
                  <MetadataRow
                    icon={Maximize}
                    label="Focal Length"
                    value={exifData.FocalLength ? `${exifData.FocalLength}mm` : null}
                  />
                  {photo.taken_at && (
                    <MetadataRow
                      icon={Calendar}
                      label="Date Taken"
                      value={formatDate(photo.taken_at)}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Technical Details */}
            {exifData && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Technical Details
                </h3>
                <div className="flex flex-wrap gap-2">
                  {exifData.LensModel && (
                    <Badge variant="secondary" className="text-xs">
                      {exifData.LensModel}
                    </Badge>
                  )}
                  {exifData.WhiteBalance && (
                    <Badge variant="secondary" className="text-xs">
                      WB: {exifData.WhiteBalance}
                    </Badge>
                  )}
                  {exifData.Flash && exifData.Flash !== 'No Flash' && (
                    <Badge variant="secondary" className="text-xs">
                      Flash
                    </Badge>
                  )}
                  {exifData.ColorSpace && (
                    <Badge variant="secondary" className="text-xs">
                      {exifData.ColorSpace}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
