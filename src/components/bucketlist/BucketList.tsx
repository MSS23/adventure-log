'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { MapPin, Check, Plus, X, Trash2, Edit2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { log } from '@/lib/utils/logger'

interface BucketListItem {
  id: string
  user_id: string
  destination: string
  country: string
  notes?: string
  completed: boolean
  completed_at?: string
  created_at: string
}

export function BucketList() {
  const { user } = useAuth()
  const [items, setItems] = useState<BucketListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newDestination, setNewDestination] = useState('')
  const [newCountry, setNewCountry] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchBucketList()
    }
  }, [user])

  async function fetchBucketList() {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('bucket_list')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setItems(data || [])
    } catch (error) {
      log.error('Failed to fetch bucket list', {
        component: 'BucketList',
        action: 'fetch'
      }, error as Error)
    } finally {
      setLoading(false)
    }
  }

  async function addItem() {
    if (!user || !newDestination.trim() || !newCountry.trim()) return

    try {
      const { data, error } = await supabase
        .from('bucket_list')
        .insert({
          user_id: user.id,
          destination: newDestination.trim(),
          country: newCountry.trim(),
          notes: newNotes.trim() || null,
          completed: false
        })
        .select()
        .single()

      if (error) throw error

      setItems([data, ...items])
      setNewDestination('')
      setNewCountry('')
      setNewNotes('')
      setShowAddForm(false)
    } catch (error) {
      log.error('Failed to add bucket list item', {
        component: 'BucketList',
        action: 'add'
      }, error as Error)
    }
  }

  async function toggleComplete(item: BucketListItem) {
    try {
      const { error } = await supabase
        .from('bucket_list')
        .update({
          completed: !item.completed,
          completed_at: !item.completed ? new Date().toISOString() : null
        })
        .eq('id', item.id)

      if (error) throw error

      setItems(items.map(i =>
        i.id === item.id
          ? { ...i, completed: !i.completed, completed_at: !i.completed ? new Date().toISOString() : undefined }
          : i
      ))
    } catch (error) {
      log.error('Failed to toggle bucket list item', {
        component: 'BucketList',
        action: 'toggle'
      }, error as Error)
    }
  }

  async function deleteItem(id: string) {
    try {
      const { error } = await supabase
        .from('bucket_list')
        .delete()
        .eq('id', id)

      if (error) throw error

      setItems(items.filter(i => i.id !== id))
    } catch (error) {
      log.error('Failed to delete bucket list item', {
        component: 'BucketList',
        action: 'delete'
      }, error as Error)
    }
  }

  const filteredItems = items.filter(item => {
    if (filter === 'active') return !item.completed
    if (filter === 'completed') return item.completed
    return true
  })

  const completedCount = items.filter(i => i.completed).length
  const totalCount = items.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-40 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg">
              <MapPin className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Travel Bucket List</h3>
              <p className="text-sm text-gray-600">Places you dream of visiting</p>
            </div>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            size="sm"
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress Bar */}
        {totalCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-semibold text-gray-900">
                {completedCount} / {totalCount} ({progressPercent}%)
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        {totalCount > 0 && (
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200",
                filter === 'all'
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200",
                filter === 'active'
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              Active ({totalCount - completedCount})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200",
                filter === 'completed'
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              Completed ({completedCount})
            </button>
          </div>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="p-6 bg-gray-50 border-b border-gray-100">
          <div className="space-y-3">
            <input
              type="text"
              value={newDestination}
              onChange={(e) => setNewDestination(e.target.value)}
              placeholder="Destination (e.g., Paris, Eiffel Tower)"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <input
              type="text"
              value={newCountry}
              onChange={(e) => setNewCountry(e.target.value)}
              placeholder="Country (e.g., France)"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <textarea
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            />
            <div className="flex gap-2">
              <Button
                onClick={addItem}
                size="sm"
                className="bg-teal-600 hover:bg-teal-700"
                disabled={!newDestination.trim() || !newCountry.trim()}
              >
                Add to List
              </Button>
              <Button
                onClick={() => {
                  setShowAddForm(false)
                  setNewDestination('')
                  setNewCountry('')
                  setNewNotes('')
                }}
                size="sm"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="p-6">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <div className="p-4 bg-gray-50 rounded-full inline-flex mb-3">
              <MapPin className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {filter === 'all'
                ? 'No destinations yet'
                : filter === 'active'
                ? 'No active destinations'
                : 'No completed destinations'}
            </p>
            {filter === 'all' && (
              <Button
                onClick={() => setShowAddForm(true)}
                size="sm"
                variant="outline"
              >
                Add Your First Destination
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "p-4 rounded-lg border transition-all duration-200 group",
                  item.completed
                    ? "bg-green-50 border-green-200"
                    : "bg-white border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleComplete(item)}
                    className={cn(
                      "flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 transition-all duration-200",
                      item.completed
                        ? "bg-green-500 border-green-500"
                        : "border-gray-300 hover:border-teal-500"
                    )}
                  >
                    {item.completed && (
                      <Check className="h-4 w-4 text-white" strokeWidth={3} />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-semibold transition-all duration-200",
                        item.completed
                          ? "text-gray-500 line-through"
                          : "text-gray-900"
                      )}
                    >
                      {item.destination}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">{item.country}</p>
                    {item.notes && (
                      <p className="text-xs text-gray-500 mt-1">{item.notes}</p>
                    )}
                    {item.completed && item.completed_at && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Completed {new Date(item.completed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors duration-200 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
