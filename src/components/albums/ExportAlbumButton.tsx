'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Download, Loader2, FileArchive, HardDrive } from 'lucide-react';
import { Album, Photo } from '@/types/database';
import { exportAlbumAsZip, estimateExportSize, formatFileSize } from '@/lib/utils/album-export';
import { Toast } from '@capacitor/toast';
import { log } from '@/lib/utils/logger';

interface ExportAlbumButtonProps {
  album: Album;
  photos: Photo[];
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function ExportAlbumButton({
  album,
  photos,
  variant = 'outline',
  size = 'sm',
}: ExportAlbumButtonProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeOriginalNames, setIncludeOriginalNames] = useState(false);

  const estimatedSize = estimateExportSize(photos);

  const handleExport = async () => {
    if (photos.length === 0) {
      await Toast.show({
        text: 'This album has no photos to export',
        duration: 'short',
      });
      return;
    }

    setExporting(true);

    try {
      await exportAlbumAsZip(album, photos, {
        includeMetadata,
        includeOriginalNames,
      });

      await Toast.show({
        text: 'Album exported successfully!',
        duration: 'short',
      });

      log.info('Album exported', {
        component: 'ExportAlbumButton',
        albumId: album.id,
        photoCount: photos.length,
        includeMetadata,
      });

      setOpen(false);
    } catch (error) {
      log.error('Failed to export album', {
        component: 'ExportAlbumButton',
        albumId: album.id,
      }, error as Error);

      await Toast.show({
        text: 'Failed to export album',
        duration: 'long',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Album</DialogTitle>
          <DialogDescription>
            Download &quot;{album.title}&quot; as a ZIP file with all photos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <FileArchive className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Photos</p>
                <p className="text-lg font-semibold">{photos.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <HardDrive className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Est. Size</p>
                <p className="text-lg font-semibold">{formatFileSize(estimatedSize)}</p>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Export Options</h4>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="metadata"
                checked={includeMetadata}
                onCheckedChange={(checked) => setIncludeMetadata(checked as boolean)}
              />
              <Label
                htmlFor="metadata"
                className="text-sm font-normal cursor-pointer"
              >
                Include metadata files (README.txt with album info and photo details)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="originalNames"
                checked={includeOriginalNames}
                onCheckedChange={(checked) => setIncludeOriginalNames(checked as boolean)}
              />
              <Label
                htmlFor="originalNames"
                className="text-sm font-normal cursor-pointer"
              >
                Use photo captions as filenames (when available)
              </Label>
            </div>
          </div>

          {/* Warning for large albums */}
          {photos.length > 50 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              <p className="font-medium">Large album detected</p>
              <p className="mt-1">
                This album contains {photos.length} photos. Export may take a few minutes and use significant bandwidth.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={exporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Album
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
