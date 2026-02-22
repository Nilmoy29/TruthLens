'use client'

import React, { useState } from 'react'
import { Bell, X, Check, CheckCheck, Trash2, AlertCircle, Info, AlertTriangle, Calendar, Clock, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { useNotifications, Notification } from '@/hooks/use-notifications'
import { formatDistanceToNow } from 'date-fns'

// Notification icon mapping
const getNotificationIcon = (type: Notification['type'], priority: Notification['priority']) => {
  const iconProps = { className: 'h-4 w-4' }
  
  switch (type) {
    case 'analysis_complete':
      return <Check {...iconProps} className={`${iconProps.className} text-green-500`} />
    case 'subscription_update':
      return <Info {...iconProps} className={`${iconProps.className} text-blue-500`} />
    case 'system_alert':
      return priority === 'urgent' 
        ? <AlertCircle {...iconProps} className={`${iconProps.className} text-red-500`} />
        : <AlertTriangle {...iconProps} className={`${iconProps.className} text-yellow-500`} />
    case 'usage_warning':
      return <AlertTriangle {...iconProps} className={`${iconProps.className} text-orange-500`} />
    case 'content_reminder':
      return <Calendar {...iconProps} className={`${iconProps.className} text-blue-500`} />
    case 'content_alert':
      return priority === 'high' 
        ? <AlertCircle {...iconProps} className={`${iconProps.className} text-red-500`} />
        : <Clock {...iconProps} className={`${iconProps.className} text-orange-500`} />
    case 'wellness_goal':
      return <Heart {...iconProps} className={`${iconProps.className} text-pink-500`} />
    default:
      return <Bell {...iconProps} />
  }
}

// Priority color mapping
const getPriorityColor = (priority: Notification['priority']) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 border-red-200 dark:bg-red-900/20 dark:border-red-800'
    case 'high':
      return 'bg-orange-100 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
    case 'normal':
      return 'bg-blue-100 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
    case 'low':
      return 'bg-gray-100 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800'
    default:
      return 'bg-gray-100 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800'
  }
}

// Individual notification item component
interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
}

function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const isExpired = notification.expires_at && new Date(notification.expires_at) < new Date()
  
  if (isExpired) {
    return null
  }

  return (
    <Card className={`mb-2 ${getPriorityColor(notification.priority)} ${!notification.read ? 'ring-2 ring-blue-500/20' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between space-x-3">
          <div className="flex items-start space-x-3 flex-1">
            <div className="flex-shrink-0 mt-1">
              {getNotificationIcon(notification.type, notification.priority)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className={`text-sm font-medium ${!notification.read ? 'font-semibold' : ''}`}>
                  {notification.title}
                </h4>
                {!notification.read && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                    New
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 capitalize">
                  {notification.priority}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {notification.message}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {!notification.read && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMarkAsRead(notification.id)}
                className="h-8 w-8 p-0"
                title="Mark as read"
              >
                <Check className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(notification.id)}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
              title="Delete notification"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Main notifications component
export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    pagination,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotifications,
  } = useNotifications()

  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead([notificationId])
  }

  const handleDelete = async (notificationId: string) => {
    await deleteNotifications([notificationId])
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
  }

  const handleLoadMore = async () => {
    if (pagination && pagination.page < pagination.totalPages) {
      await fetchNotifications({ page: pagination.page + 1, limit: pagination.limit })
    }
  }

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
                  className="text-xs"
                >
                  {filter === 'all' ? 'Show Unread' : 'Show All'}
                </Button>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="text-xs"
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Mark All Read
                  </Button>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            {error && (
              <div className="p-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20">
                {error}
              </div>
            )}
            
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>
                  {filter === 'unread' 
                    ? 'No unread notifications' 
                    : 'No notifications yet'
                  }
                </p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="p-4 space-y-2">
                  {filteredNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                      onDelete={handleDelete}
                    />
                  ))}
                  
                  {pagination && pagination.page < pagination.totalPages && (
                    <div className="pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLoadMore}
                        disabled={loading}
                        className="w-full"
                      >
                        {loading ? 'Loading...' : 'Load More'}
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  )
}

// Simple notification badge component for showing unread count
export function NotificationBadge() {
  const { unreadCount } = useNotifications()

  if (unreadCount === 0) {
    return null
  }

  return (
    <Badge 
      variant="destructive" 
      className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
    >
      {unreadCount > 99 ? '99+' : unreadCount}
    </Badge>
  )
}