'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Edit, Calendar, MapPin, Camera, Loader2 } from 'lucide-react';
import { Photo } from '@/types/database';
import { updatePhotoMetadata } from '@/app/actions/photo-metadata';
import { Toast } from '@capacitor/toast';
import { log } from '@/lib/utils/logger';

interface PhotoMetadataEditorProps {
  photo: Photo;
  onUpdate?: (updatedPhoto: Photo) => void;
  trigger?: React.ReactNode;
}

export function PhotoMetadataEditor({ photo, onUpdate, trigger }: PhotoMetadataEditorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [takenAt, setTakenAt] = useState(
    photo.taken_at ? new Date(photo.taken_at).toISOString().slice(0, 16) : ''
  );
  const [locationName, setLocationName] = useState(photo.location_name || '');
  const [latitude, setLatitude] = useState(photo.latitude?.toString() || '');
  const [longitude, setLongitude] = useState(photo.longitude?.toString() || '');
  const [caption, setCaption] = useState(photo.caption || '');
  const [cameraMake, setCameraMake] = useState(photo.camera_make || '');
  const [cameraModel, setCameraModel] = useState(photo.camera_model || '');
  const [iso, setIso] = useState(photo.iso?.toString() || '');
  const [aperture, setAperture] = useState(photo.aperture || '');
  const [shutterSpeed, setShutterSpeed] = useState(photo.shutter_speed || '');

  const handleSave = async () => {
    setLoading(true);

    try {
      const result = await updatePhotoMetadata({
        photoId: photo.id,
        taken_at: takenAt || undefined,
        location_name: locationName || undefined,
        location_lat: latitude ? parseFloat(latitude) : undefined,
        location_lng: longitude ? parseFloat(longitude) : undefined,
        caption: caption || undefined,
        camera_make: cameraMake || undefined,
        camera_model: cameraModel || undefined,
        iso: iso ? parseInt(iso) : undefined,
        aperture: aperture || undefined,
        shutter_speed: shutterSpeed || undefined,
      });

      if (result.success && result.data) {
        await Toast.show({
          text: 'Photo metadata updated!',
          duration: 'short',
        });

        if (onUpdate) {
          onUpdate(result.data);
        }

        setOpen(false);
      } else {
        throw new Error(result.error || 'Failed to update metadata');
      }
    } catch (error) {
      log.error('Failed to update photo metadata', {
        component: 'PhotoMetadataEditor',
        photoId: photo.id,
      }, error as Error);

      await Toast.show({
        text: error instanceof Error ? error.message : 'Failed to update metadata',
        duration: 'long',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit Metadata
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Photo Metadata</DialogTitle>
          <DialogDescription>
            Manually override or correct photo metadata extracted from EXIF data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date & Time
            </h3>
            <div className="space-y-2">
              <Label htmlFor="taken_at">Date Taken</Label>
              <Input
                id="taken_at"
                type="datetime-local"
                value={takenAt}
                onChange={(e) => setTakenAt(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Original: {photo.taken_at ? new Date(photo.taken_at).toLocaleString() : 'Not set'}
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </h3>
            <div className="space-y-2">
              <Label htmlFor="location_name">Location Name</Label>
              <Input
                id="location_name"
                type="text"
                placeholder="e.g., Eiffel Tower, Paris"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  placeholder="e.g., 48.8584"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  placeholder="e.g., 2.2945"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                />
              </div>
            </div>
            {photo.latitude && photo.longitude && (
              <p className="text-xs text-gray-500">
                Original: {photo.latitude.toFixed(6)}, {photo.longitude.toFixed(6)}
              </p>
            )}
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <Label htmlFor="caption">Caption</Label>
            <Input
              id="caption"
              type="text"
              placeholder="Add a description..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>

          {/* Camera Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Camera Settings
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="camera_make">Camera Make</Label>
                <Input
                  id="camera_make"
                  type="text"
                  placeholder="e.g., Canon"
                  value={cameraMake}
                  onChange={(e) => setCameraMake(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="camera_model">Camera Model</Label>
                <Input
                  id="camera_model"
                  type="text"
                  placeholder="e.g., EOS R5"
                  value={cameraModel}
                  onChange={(e) => setCameraModel(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="iso">ISO</Label>
                <Input
                  id="iso"
                  type="number"
                  placeholder="e.g., 400"
                  value={iso}
                  onChange={(e) => setIso(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aperture">Aperture</Label>
                <Input
                  id="aperture"
                  type="text"
                  placeholder="e.g., f/2.8"
                  value={aperture}
                  onChange={(e) => setAperture(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shutter_speed">Shutter Speed</Label>
                <Input
                  id="shutter_speed"
                  type="text"
                  placeholder="e.g., 1/200"
                  value={shutterSpeed}
                  onChange={(e) => setShutterSpeed(e.target.value)}
                />
              </div>
            </div>
            {(photo.camera_make || photo.camera_model) && (
              <p className="text-xs text-gray-500">
                Original: {[photo.camera_make, photo.camera_model].filter(Boolean).join(' ')}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
