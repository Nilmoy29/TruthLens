'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Clock, Eye, TrendingUp, Globe, BookOpen, AlertTriangle } from 'lucide-react'

interface ConsumptionData {
  id: string
  timestamp: string
  url: string
  title: string
  domain: string
  content_type: string
  word_count: number
  reading_time: number
  time_spent: number
  scroll_depth: number
  author: string
  publish_date: string | null
  source: string
  credibility_score: number
  bias_score: number
  engagement_score: number
  tags: string[]
  category: string
}

interface Analytics {
  total_items: number
  total_time_spent: number
  average_engagement: number
  top_domains: { domain: string; count: number }[]
  content_categories: { category: string; count: number }[]
  daily_consumption: { date: string; count: number; total_time: number }[]
}

export default function AnalyticsPage() {
  const [consumptionData, setConsumptionData] = useState<ConsumptionData[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    fetchConsumptionData()
  }, [selectedCategory])

  const fetchConsumptionData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: '100'
      })
      
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory)
      }
      
      const response = await fetch(`/api/content-calendar/consumption?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setConsumptionData(result.data)
        setAnalytics(result.analytics)
      }
    } catch (error) {
      console.error('Error fetching consumption data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const getCredibilityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getBiasColor = (score: number) => {
    if (score <= 0.3) return 'text-green-600'
    if (score <= 0.7) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading analytics...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Content Consumption Analytics</h1>
        <p className="text-muted-foreground">
          Track and analyze your content consumption patterns with automatic credibility and bias detection.
        </p>
      </div>

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.total_items}</div>
              <p className="text-xs text-muted-foreground">Content pieces analyzed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTime(analytics.total_time_spent)}</div>
              <p className="text-xs text-muted-foreground">Time spent reading</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(analytics.average_engagement * 100).toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Engagement score</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sources</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.top_domains.length}</div>
              <p className="text-xs text-muted-foreground">Unique domains</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="recent" className="space-y-6">
        <TabsList>
          <TabsTrigger value="recent">Recent Content</TabsTrigger>
          <TabsTrigger value="sources">Top Sources</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="daily">Daily Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          <div className="flex gap-2 mb-4">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              All
            </Button>
            {analytics?.content_categories.map((cat) => (
              <Button
                key={cat.category}
                variant={selectedCategory === cat.category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat.category)}
              >
                {cat.category} ({cat.count})
              </Button>
            ))}
          </div>

          <div className="space-y-4">
            {consumptionData.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{item.title}</CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        <span>{item.domain}</span>
                        <span>•</span>
                        <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{formatTime(item.time_spent)}</span>
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">{item.category}</Badge>
                      {item.bias_score > 0.7 && (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          High Bias
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm font-medium mb-1">Credibility Score</div>
                      <div className={`text-lg font-bold ${getCredibilityColor(item.credibility_score)}`}>
                        {(item.credibility_score * 100).toFixed(0)}%
                      </div>
                      <Progress value={item.credibility_score * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">Bias Score</div>
                      <div className={`text-lg font-bold ${getBiasColor(item.bias_score)}`}>
                        {(item.bias_score * 100).toFixed(0)}%
                      </div>
                      <Progress value={item.bias_score * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">Engagement</div>
                      <div className="text-lg font-bold">
                        {(item.engagement_score * 100).toFixed(0)}%
                      </div>
                      <Progress value={item.engagement_score * 100} className="h-2" />
                    </div>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sources">
          <Card>
            <CardHeader>
              <CardTitle>Top Content Sources</CardTitle>
              <CardDescription>Most frequently visited domains</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.top_domains.map((domain, index) => (
                  <div key={domain.domain} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium">#{index + 1}</div>
                      <div>
                        <div className="font-medium">{domain.domain}</div>
                        <div className="text-sm text-muted-foreground">{domain.count} articles</div>
                      </div>
                    </div>
                    <Progress value={(domain.count / analytics.total_items) * 100} className="w-24 h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Content Categories</CardTitle>
              <CardDescription>Distribution of content types</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.content_categories.map((category) => (
                  <div key={category.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{category.category}</Badge>
                      <div className="text-sm text-muted-foreground">{category.count} items</div>
                    </div>
                    <Progress value={(category.count / analytics.total_items) * 100} className="w-24 h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle>Daily Consumption</CardTitle>
              <CardDescription>Content consumption over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.daily_consumption.slice(0, 7).map((day) => (
                  <div key={day.date} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{new Date(day.date).toLocaleDateString()}</div>
                      <div className="text-sm text-muted-foreground">
                        {day.count} articles • {formatTime(day.total_time)}
                      </div>
                    </div>
                    <Progress value={(day.count / Math.max(...analytics.daily_consumption.map(d => d.count))) * 100} className="w-24 h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}