/**
 * Offline Sync Hook
 * Manages upload queue for offline content creation and sync
 */

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { UploadQueueItem } from '@/types/database'

interface QueueAlbumUpload {
  title: string
  description?: string
  location_name?: string
  latitude?: number
  longitude?: number
  country_code?: string
  photos: Array<{
    file: File
    caption?: string
    order_index: number
  }>
}

export function useOfflineSync() {
  const [queueItems, setQueueItems] = useState<UploadQueueItem[]>([])
  const [isOnline, setIsOnline] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const supabase = createClient()

  // Check online status
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine)
    }

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    updateOnlineStatus()

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  // Fetch pending uploads
  const fetchPendingUploads = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .rpc('get_pending_uploads', { user_id_param: user.id })

      if (error) throw error

      setQueueItems(data || [])
    } catch (err) {
      console.error('Error fetching pending uploads:', err)
    }
  }

  // Queue an album upload for when online
  const queueAlbumUpload = async (albumData: QueueAlbumUpload) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Generate local ID
      const localId = `album_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Store files in IndexedDB for later upload
      const filesMetadata = albumData.photos.map(photo => ({
        path: URL.createObjectURL(photo.file),
        type: photo.file.type,
        size: photo.file.size,
        caption: photo.caption,
        order_index: photo.order_index
      }))

      // Add to upload queue
      const { error } = await supabase
        .from('upload_queue')
        .insert({
          user_id: user.id,
          resource_type: 'album',
          local_id: localId,
          payload: {
            title: albumData.title,
            description: albumData.description,
            location_name: albumData.location_name,
            latitude: albumData.latitude,
            longitude: albumData.longitude,
            country_code: albumData.country_code,
            photo_count: albumData.photos.length
          },
          files_to_upload: filesMetadata,
          status: 'pending'
        })

      if (error) throw error

      // Store files in IndexedDB
      await storeFilesInIndexedDB(localId, albumData.photos)

      await fetchPendingUploads()

      // If online, trigger sync immediately
      if (isOnline) {
        syncPendingUploads()
      }

      return localId
    } catch (err) {
      console.error('Error queuing album upload:', err)
      throw err
    }
  }

  // Store files in IndexedDB for offline access
  const storeFilesInIndexedDB = async (
    localId: string, 
    photos: Array<{ file: File; caption?: string; order_index: number }>
  ) => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AdventureLogOffline', 1)

      request.onerror = () => reject(request.error)

      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(['uploads'], 'readwrite')
        const store = transaction.objectStore('uploads')

        store.put({
          localId,
          photos: photos.map(p => ({
            file: p.file,
            caption: p.caption,
            order_index: p.order_index
          })),
          timestamp: Date.now()
        })

        transaction.oncomplete = () => resolve(true)
        transaction.onerror = () => reject(transaction.error)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('uploads')) {
          db.createObjectStore('uploads', { keyPath: 'localId' })
        }
      }
    })
  }

  // Retrieve files from IndexedDB
  const getFilesFromIndexedDB = async (localId: string): Promise<{ localId: string; photos: Array<{ file: File; caption?: string; order_index: number }>; timestamp: number } | undefined> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AdventureLogOffline', 1)

      request.onerror = () => reject(request.error)

      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(['uploads'], 'readonly')
        const store = transaction.objectStore('uploads')
        const getRequest = store.get(localId)

        getRequest.onsuccess = () => resolve(getRequest.result)
        getRequest.onerror = () => reject(getRequest.error)
      }
    })
  }

  // Sync pending uploads
  const syncPendingUploads = useCallback(async () => {
    if (!isOnline || isSyncing) return

    try {
      setIsSyncing(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: pendingItems, error } = await supabase
        .rpc('get_pending_uploads', { user_id_param: user.id })

      if (error) throw error

      if (!pendingItems || pendingItems.length === 0) {
        setIsSyncing(false)
        return
      }

      // Process each pending upload
      for (const item of pendingItems) {
        try {
          await processUpload(item)
        } catch (err) {
          console.error(`Failed to process upload ${item.upload_id}:`, err)
          // Update status to failed
          await supabase
            .from('upload_queue')
            .update({
              status: 'failed',
              error_message: err instanceof Error ? err.message : 'Upload failed',
              retry_count: item.retry_count + 1
            })
            .eq('id', item.upload_id)
        }
      }

      await fetchPendingUploads()
    } catch (err) {
      console.error('Error syncing uploads:', err)
    } finally {
      setIsSyncing(false)
    }
  }, [isOnline, isSyncing, supabase, fetchPendingUploads, processUpload])

  // Process a single upload
  const processUpload = async (item: UploadQueueItem) => {
    if (item.resource_type === 'album') {
      // Update status to uploading
      await supabase
        .from('upload_queue')
        .update({ status: 'uploading', upload_started_at: new Date().toISOString() })
        .eq('id', item.id)

      // Get files from IndexedDB
      const storedData = await getFilesFromIndexedDB(item.local_id || '')
      
      if (!storedData) {
        throw new Error('Files not found in offline storage')
      }

      // Create album
      const { data: album, error: albumError } = await supabase
        .from('albums')
        .insert({
          title: item.payload.title,
          description: item.payload.description,
          location_name: item.payload.location_name,
          latitude: item.payload.latitude,
          longitude: item.payload.longitude,
          country_code: item.payload.country_code,
          visibility: 'public'
        })
        .select()
        .single()

      if (albumError) throw albumError

      // Upload photos
      const photoIds: string[] = []
      for (const photo of storedData.photos) {
        const fileName = `${album.id}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`
        
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, photo.file)

        if (uploadError) throw uploadError

        const { data: photoRecord, error: photoError } = await supabase
          .from('photos')
          .insert({
            album_id: album.id,
            file_path: fileName,
            caption: photo.caption,
            order_index: photo.order_index
          })
          .select()
          .single()

        if (photoError) throw photoError

        photoIds.push(photoRecord.id)
      }

      // Mark upload as completed
      await supabase
        .from('upload_queue')
        .update({
          status: 'completed',
          upload_completed_at: new Date().toISOString(),
          remote_album_id: album.id,
          remote_photo_ids: photoIds
        })
        .eq('id', item.id)

      // Clean up IndexedDB
      await deleteFromIndexedDB(item.local_id || '')
    }
  }

  // Delete from IndexedDB
  const deleteFromIndexedDB = async (localId: string) => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AdventureLogOffline', 1)

      request.onerror = () => reject(request.error)

      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(['uploads'], 'readwrite')
        const store = transaction.objectStore('uploads')
        const deleteRequest = store.delete(localId)

        deleteRequest.onsuccess = () => resolve(true)
        deleteRequest.onerror = () => reject(deleteRequest.error)
      }
    })
  }

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline) {
      syncPendingUploads()
    }
  }, [isOnline, syncPendingUploads])

  // Fetch pending uploads on mount
  useEffect(() => {
    fetchPendingUploads()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    queueItems,
    isOnline,
    isSyncing,
    queueAlbumUpload,
    syncPendingUploads,
    refresh: fetchPendingUploads
  }
}

