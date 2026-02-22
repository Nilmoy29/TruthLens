"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Navigation } from '@/components/navigation'
import {
  Calendar,
  Clock,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  BookOpen,
  Video,
  FileText,
  Share2,
  Plus,
  BarChart3,
  Lightbulb,
  Heart,
  Brain,
  Eye,
  ChevronLeft,
  ChevronRight,
  Settings,
  RefreshCw
} from 'lucide-react'
// Authentication disabled - no longer using supabase auth

interface ContentRecommendation {
  id: string
  title: string
  type: 'article' | 'video' | 'podcast' | 'social_post'
  url?: string
  source: string
  estimatedTime: number
  credibilityScore: number
  biasScore: number
  description: string
  consumed?: boolean
  consumedAt?: string
}

interface CalendarEntry {
  id: string
  calendar_date: string
  daily_theme: string
  wellness_tip: string
  daily_goals: string[]
  recommended_content: ContentRecommendation[]
  planned_consumption: {
    total_time_planned: number
    articles: number
    videos: number
    social_posts: number
  }
  actual_consumption: {
    total_time_spent: number
    articles_read: number
    videos_watched: number
    social_posts_viewed: number
  }
  wellness_score: number
}

interface ConsumptionLog {
  id: string
  content_type: string
  url: string
  source: string
  time_spent: number
  completion_percentage: number
  credibility_score: number
  bias_score: number
  consumed_at: string
}

interface HealthAlert {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high'
  title: string
  message: string
  recommendations: string[]
  created_at: string
}

export default function ContentCalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [calendarData, setCalendarData] = useState<CalendarEntry | null>(null)
  const [consumptionLogs, setConsumptionLogs] = useState<ConsumptionLog[]>([])
  const [healthAlerts, setHealthAlerts] = useState<HealthAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [logDialogOpen, setLogDialogOpen] = useState(false)
  const [selectedContent, setSelectedContent] = useState<ContentRecommendation | null>(null)
  const [consumptionForm, setConsumptionForm] = useState({
    url: '',
    timeSpent: '',
    completionPercentage: 100
  })

  useEffect(() => {
    fetchCalendarData()
    fetchHealthAlerts()
    setLoading(false)
  }, [selectedDate])

  const fetchCalendarData = async () => {
    try {
      const response = await fetch(`/api/content-calendar?date=${selectedDate}&include_consumption=true`)
      if (response.ok) {
        const data = await response.json()
        setCalendarData(data.data)
        setConsumptionLogs(data.consumption_logs || [])
      }
    } catch (error) {
      console.error('Error fetching calendar data:', error)
    }
  }

  const fetchHealthAlerts = async () => {
    try {
      const response = await fetch('/api/content-analysis?days=1&include_alerts=true')
      if (response.ok) {
        const data = await response.json()
        setHealthAlerts(data.alerts || [])
      }
    } catch (error) {
      console.error('Error fetching health alerts:', error)
    }
  }

  const generateRecommendations = async () => {
    setGenerating(true)
    try {
      const response = await fetch('/api/content-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate })
      })
      
      if (response.ok) {
        await fetchCalendarData()
      }
    } catch (error) {
      console.error('Error generating recommendations:', error)
    } finally {
      setGenerating(false)
    }
  }

  const logConsumption = async () => {
    try {
      const response = await fetch('/api/content-calendar/consumption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendar_id: calendarData?.id,
          content_type: selectedContent?.type || 'article',
          url: consumptionForm.url,
          source: selectedContent?.source || 'Manual Entry',
          time_spent: parseInt(consumptionForm.timeSpent),
          completion_percentage: consumptionForm.completionPercentage
        })
      })
      
      if (response.ok) {
        setLogDialogOpen(false)
        setConsumptionForm({ url: '', timeSpent: '', completionPercentage: 100 })
        setSelectedContent(null)
        await fetchCalendarData()
        await fetchHealthAlerts()
      }
    } catch (error) {
      console.error('Error logging consumption:', error)
    }
  }

  const markContentConsumed = (content: ContentRecommendation) => {
    setSelectedContent(content)
    setConsumptionForm({
      url: content.url || '',
      timeSpent: content.estimatedTime.toString(),
      completionPercentage: 100
    })
    setLogDialogOpen(true)
  }

  const changeDate = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate)
    if (direction === 'prev') {
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      currentDate.setDate(currentDate.getDate() + 1)
    }
    setSelectedDate(currentDate.toISOString().split('T')[0])
  }

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'article': return <FileText className="h-4 w-4" />
      case 'video': return <Video className="h-4 w-4" />
      case 'podcast': return <BookOpen className="h-4 w-4" />
      default: return <Share2 className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const todayConsumption = consumptionLogs.reduce((total, log) => total + (log.time_spent || 0), 0)
  const plannedTime = calendarData?.planned_consumption?.total_time_planned || 0
  const progressPercentage = plannedTime > 0 ? Math.min((todayConsumption / plannedTime) * 100, 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Content Calendar</h1>
            <p className="text-gray-600">Your personalized AI-powered content wellness dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => window.location.href = '/settings'}>
              <Settings className="h-4 w-4 mr-2" />
              Preferences
            </Button>
            <Button onClick={generateRecommendations} disabled={generating}>
              <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Generating...' : 'Refresh'}
            </Button>
          </div>
        </div>

      {/* Health Alerts */}
      {healthAlerts.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Health Alerts
          </h2>
          <div className="grid gap-4">
            {healthAlerts.map((alert) => (
              <Alert key={alert.id} className={getSeverityColor(alert.severity)}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{alert.title}</p>
                      <p className="text-sm mt-1">{alert.message}</p>
                      {alert.recommendations.length > 0 && (
                        <ul className="text-sm mt-2 space-y-1">
                          {alert.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <Lightbulb className="h-3 w-3" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <Badge variant="outline">{alert.severity}</Badge>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </div>
      )}

      {/* Date Navigation */}
      <div className="flex items-center justify-center mb-6">
        <Button variant="outline" size="sm" onClick={() => changeDate('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="mx-4 text-center">
          <h2 className="text-xl font-semibold">
            {new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => changeDate('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Daily Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Daily Theme & Goals */}
          {calendarData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  Today's Focus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-lg mb-2">{calendarData.daily_theme}</h3>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Daily Goals
                    </h4>
                    <ul className="space-y-1">
                      {calendarData.daily_goals.map((goal, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          {goal}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      Wellness Tip
                    </h4>
                    <p className="text-sm text-gray-700">{calendarData.wellness_tip}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-green-500" />
                Recommended Content
              </CardTitle>
              <CardDescription>
                AI-curated content based on your preferences and wellness goals
              </CardDescription>
            </CardHeader>
            <CardContent>
              {calendarData?.recommended_content && Array.isArray(calendarData.recommended_content) && calendarData.recommended_content.length > 0 ? (
                <div className="space-y-4">
                  {calendarData.recommended_content.map((content) => (
                    <div key={content.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getContentTypeIcon(content.type)}
                            <Badge variant="outline">{content.type}</Badge>
                            <Badge variant="secondary">{content.estimatedTime}m</Badge>
                          </div>
                          <h4 className="font-medium mb-1">{content.title}</h4>
                          <p className="text-sm text-gray-600 mb-2">{content.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Source: {content.source}</span>
                            <span>Credibility: {(content.credibilityScore * 100).toFixed(0)}%</span>
                            <span>Bias: {content.biasScore.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {content.url && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={content.url} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </a>
                            </Button>
                          )}
                          <Button size="sm" onClick={() => markContentConsumed(content)}>
                            <Plus className="h-3 w-3 mr-1" />
                            Log
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No recommendations yet for this date</p>
                  <Button onClick={generateRecommendations} disabled={generating}>
                    {generating ? 'Generating...' : 'Generate Recommendations'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Progress & Stats */}
        <div className="space-y-6">
          {/* Daily Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                Daily Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Time Consumed</span>
                    <span>{todayConsumption}m / {plannedTime}m</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {consumptionLogs.filter(log => log.content_type === 'article').length}
                    </div>
                    <div className="text-xs text-gray-600">Articles</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {consumptionLogs.filter(log => log.content_type === 'video').length}
                    </div>
                    <div className="text-xs text-gray-600">Videos</div>
                  </div>
                </div>

                {calendarData?.wellness_score && (
                  <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Wellness Score</span>
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-red-500" />
                        <span className="text-lg font-bold">{calendarData.wellness_score}/100</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Consumption */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {consumptionLogs.length > 0 ? (
                <div className="space-y-3">
                  {consumptionLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {getContentTypeIcon(log.content_type)}
                        <span className="truncate max-w-32">{log.source}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{log.time_spent}m</div>
                        <div className="text-xs text-gray-500">
                          {new Date(log.consumed_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-sm text-center py-4">
                  No activity recorded today
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Log Consumption Dialog */}
      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Content Consumption</DialogTitle>
            <DialogDescription>
              Track your content consumption to maintain healthy viewing habits
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Content URL</label>
              <Input
                value={consumptionForm.url}
                onChange={(e) => setConsumptionForm(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://example.com/article"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Time Spent (minutes)</label>
              <Input
                type="number"
                value={consumptionForm.timeSpent}
                onChange={(e) => setConsumptionForm(prev => ({ ...prev, timeSpent: e.target.value }))}
                placeholder="15"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Completion Percentage</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={consumptionForm.completionPercentage}
                onChange={(e) => setConsumptionForm(prev => ({ ...prev, completionPercentage: parseInt(e.target.value) }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={logConsumption}>
              Log Consumption
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}