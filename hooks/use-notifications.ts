'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface Notification {
  id: string
  user_id: string
  type: 'analysis_complete' | 'subscription_update' | 'system_alert' | 'usage_warning' | 'content_reminder' | 'content_alert' | 'wellness_goal'
  title: string
  message: string
  data: Record<string, any>
  read: boolean
  priority: 'low' | 'normal' | 'high' | 'urgent'
  expires_at?: string
  created_at: string
  updated_at: string
}

export interface NotificationsPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  pagination: NotificationsPagination | null
  loading: boolean
  error: string | null
  fetchNotifications: (options?: FetchNotificationsOptions) => Promise<void>
  markAsRead: (notificationIds: string[]) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotifications: (notificationIds: string[]) => Promise<void>
  refreshUnreadCount: () => Promise<void>
}

export interface FetchNotificationsOptions {
  page?: number
  limit?: number
  unreadOnly?: boolean
  type?: string
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [pagination, setPagination] = useState<NotificationsPagination | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null)

  const supabase = createClientComponentClient()

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (options: FetchNotificationsOptions = {}) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (options.page) params.append('page', options.page.toString())
      if (options.limit) params.append('limit', options.limit.toString())
      if (options.unreadOnly) params.append('unread_only', 'true')
      if (options.type) params.append('type', options.type)

      const response = await fetch(`/api/notifications?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (options.page && options.page > 1) {
        // Append to existing notifications for pagination
        setNotifications(prev => [...prev, ...data.notifications])
      } else {
        // Replace notifications for initial load or refresh
        setNotifications(data.notifications)
      }
      
      setPagination(data.pagination)
      setUnreadCount(data.unreadCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  // Mark notifications as read
  const markAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationIds }),
      })

      if (!response.ok) {
        throw new Error(`Failed to mark notifications as read: ${response.statusText}`)
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notificationIds.includes(notification.id)
            ? { ...notification, read: true }
            : notification
        )
      )

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - notificationIds.length))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notifications as read')
    }
  }, [])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markAllAsRead: true }),
      })

      if (!response.ok) {
        throw new Error(`Failed to mark all notifications as read: ${response.statusText}`)
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      )
      setUnreadCount(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read')
    }
  }, [])

  // Delete notifications
  const deleteNotifications = useCallback(async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationIds }),
      })

      if (!response.ok) {
        throw new Error(`Failed to delete notifications: ${response.statusText}`)
      }

      // Update local state
      setNotifications(prev => 
        prev.filter(notification => !notificationIds.includes(notification.id))
      )

      // Update unread count for deleted unread notifications
      const deletedUnreadCount = notifications.filter(
        notification => notificationIds.includes(notification.id) && !notification.read
      ).length
      setUnreadCount(prev => Math.max(0, prev - deletedUnreadCount))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete notifications')
    }
  }, [notifications])

  // Refresh unread count
  const refreshUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?limit=1', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to refresh unread count: ${response.statusText}`)
      }

      const data = await response.json()
      setUnreadCount(data.unreadCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh unread count')
    }
  }, [])

  // Set up real-time subscription
  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          return
        }

        // Create realtime channel
        const channel = supabase
          .channel('notifications')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              const newNotification = payload.new as Notification
              
              // Add new notification to the beginning of the list
              setNotifications(prev => [newNotification, ...prev])
              
              // Increment unread count if notification is unread
              if (!newNotification.read) {
                setUnreadCount(prev => prev + 1)
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              const updatedNotification = payload.new as Notification
              
              // Update notification in the list
              setNotifications(prev => 
                prev.map(notification => 
                  notification.id === updatedNotification.id
                    ? updatedNotification
                    : notification
                )
              )
              
              // Update unread count if read status changed
              const oldNotification = payload.old as Notification
              if (oldNotification.read !== updatedNotification.read) {
                if (updatedNotification.read) {
                  setUnreadCount(prev => Math.max(0, prev - 1))
                } else {
                  setUnreadCount(prev => prev + 1)
                }
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              const deletedNotification = payload.old as Notification
              
              // Remove notification from the list
              setNotifications(prev => 
                prev.filter(notification => notification.id !== deletedNotification.id)
              )
              
              // Update unread count if deleted notification was unread
              if (!deletedNotification.read) {
                setUnreadCount(prev => Math.max(0, prev - 1))
              }
            }
          )
          .subscribe()

        setRealtimeChannel(channel)
      } catch (err) {
        console.error('Failed to set up realtime subscription:', err)
      }
    }

    setupRealtimeSubscription()

    // Cleanup function
    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel)
      }
    }
  }, [supabase])

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [])

  return {
    notifications,
    unreadCount,
    pagination,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotifications,
    refreshUnreadCount,
  }
}