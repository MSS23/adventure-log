'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, X, UserPlus, Link as LinkIcon, Trash2, Settings, Clock } from 'lucide-react';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { createAlbumShare, getAlbumShares, deleteAlbumShare, updateAlbumShare } from '@/app/actions/album-sharing';
import type { AlbumShare, SharePermissionLevel } from '@/types/database';
import { log } from '@/lib/utils/logger';
import { Toast } from '@capacitor/toast';

interface ShareAlbumDialogProps {
  albumId: string;
  albumTitle: string;
  trigger?: React.ReactNode;
}

export function ShareAlbumDialog({ albumId, albumTitle, trigger }: ShareAlbumDialogProps) {
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState<AlbumShare[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<SharePermissionLevel>('view');
  const [expirationDays, setExpirationDays] = useState<string>('never');

  // Load existing shares
  useEffect(() => {
    if (open) {
      loadShares();
    }
  }, [open]);

  const loadShares = async () => {
    const result = await getAlbumShares(albumId);
    if (result.success && result.data) {
      setShares(result.data);
    }
  };

  const handleCreateShare = async () => {
    if (!email && expirationDays === 'never') {
      // Create public link
      await createPublicShare();
    } else {
      // Create user-specific share
      await createUserShare();
    }
  };

  const createPublicShare = async () => {
    setLoading(true);
    try {
      const result = await createAlbumShare({
        album_id: albumId,
        permission_level: permissionLevel,
      });

      if (result.success && result.data) {
        await Toast.show({
          text: 'Share link created successfully!',
          duration: 'short',
        });
        setShares([...shares, result.data]);
        copyShareLink(result.data.share_token);
      } else {
        throw new Error(result.error || 'Failed to create share');
      }
    } catch (error) {
      log.error('Failed to create share', { component: 'ShareAlbumDialog' }, error as Error);
      await Toast.show({
        text: 'Failed to create share link',
        duration: 'short',
      });
    } finally {
      setLoading(false);
    }
  };

  const createUserShare = async () => {
    if (!email) {
      await Toast.show({
        text: 'Please enter an email address',
        duration: 'short',
      });
      return;
    }

    setLoading(true);
    try {
      const expiresAt = expirationDays !== 'never'
        ? new Date(Date.now() + parseInt(expirationDays) * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      const result = await createAlbumShare({
        album_id: albumId,
        shared_with_email: email,
        permission_level: permissionLevel,
        expires_at: expiresAt,
      });

      if (result.success && result.data) {
        await Toast.show({
          text: `Album shared with ${email}!`,
          duration: 'short',
        });
        setShares([...shares, result.data]);
        setEmail('');
      } else {
        throw new Error(result.error || 'Failed to share album');
      }
    } catch (error) {
      log.error('Failed to share album', { component: 'ShareAlbumDialog' }, error as Error);
      await Toast.show({
        text: error instanceof Error ? error.message : 'Failed to share album',
        duration: 'long',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = (token: string) => {
    const url = `${window.location.origin}/albums/shared/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteShare = async (shareId: string) => {
    const result = await deleteAlbumShare(shareId);
    if (result.success) {
      setShares(shares.filter(s => s.id !== shareId));
      await Toast.show({
        text: 'Share revoked successfully',
        duration: 'short',
      });
    }
  };

  const getPermissionLabel = (level: SharePermissionLevel) => {
    switch (level) {
      case 'view':
        return 'Can view';
      case 'contribute':
        return 'Can add photos';
      case 'edit':
        return 'Can edit';
      default:
        return level;
    }
  };

  const getPermissionColor = (level: SharePermissionLevel) => {
    switch (level) {
      case 'view':
        return 'bg-gray-100 text-gray-800';
      case 'contribute':
        return 'bg-blue-100 text-blue-800';
      case 'edit':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share &quot;{albumTitle}&quot;</DialogTitle>
          <DialogDescription>
            Invite others to view or collaborate on this album
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create new share */}
          <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="font-semibold text-sm">Invite someone</h3>

            <div className="space-y-2">
              <Label htmlFor="email">Email address (optional for link sharing)</Label>
              <Input
                id="email"
                type="email"
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="permission">Permission level</Label>
                <Select
                  value={permissionLevel}
                  onValueChange={(value) => setPermissionLevel(value as SharePermissionLevel)}
                >
                  <SelectTrigger id="permission">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Can view</span>
                        <span className="text-xs text-gray-500">View photos only</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="contribute">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Can contribute</span>
                        <span className="text-xs text-gray-500">Add photos and comments</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="edit">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Can edit</span>
                        <span className="text-xs text-gray-500">Full access (add, delete, edit)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiration">Expires in</Label>
                <Select value={expirationDays} onValueChange={setExpirationDays}>
                  <SelectTrigger id="expiration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleCreateShare}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                'Creating...'
              ) : email ? (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send invitation
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Create share link
                </>
              )}
            </Button>
          </div>

          {/* Existing shares */}
          {shares.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Active shares ({shares.length})</h3>
              <div className="space-y-2">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {share.shared_with?.email || share.shared_with?.username || 'Anyone with link'}
                        </span>
                        <Badge className={getPermissionColor(share.permission_level)}>
                          {getPermissionLabel(share.permission_level)}
                        </Badge>
                        {share.expires_at && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Expires {new Date(share.expires_at).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                      {!share.shared_with_user_id && (
                        <button
                          onClick={() => copyShareLink(share.share_token)}
                          className="text-xs text-blue-600 hover:underline mt-1 flex items-center gap-1"
                        >
                          {copied ? (
                            <>
                              <Check className="h-3 w-3" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy link
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteShare(share.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
