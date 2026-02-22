"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  Clock,
  FileText,
  Image,
  BarChart3,
  MoreVertical,
  Trash2,
  Share2,
  Copy,
  ExternalLink
} from "lucide-react"
import { supabase } from "@/lib/supabase-client"

interface HistoryItem {
  id: string
  type: 'fact_check' | 'bias_analysis' | 'media_verification'
  title: string
  content: string
  result: any
  score?: number
  authenticity?: string
  bias_score?: number
  created_at: string
  user_id: string
}

interface FilterOptions {
  type: string
  dateRange: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<FilterOptions>({
    type: 'all',
    dateRange: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc'
  })
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch fact checks
        const { data: factChecks } = await supabase
          .from('fact_checks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        // Fetch bias analyses
        const { data: biasAnalyses } = await supabase
          .from('bias_analyses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        // Fetch media verifications
        const { data: mediaVerifications } = await supabase
          .from('media_verifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        // Combine and format all history items
        const allHistory: HistoryItem[] = [
          ...(factChecks || []).map(item => ({
            id: item.id,
            type: 'fact_check' as const,
            title: item.claim?.substring(0, 100) + '...' || 'Fact Check',
            content: item.claim || '',
            result: item.result,
            score: item.result?.credibility_score,
            created_at: item.created_at,
            user_id: item.user_id
          })),
          ...(biasAnalyses || []).map(item => ({
            id: item.id,
            type: 'bias_analysis' as const,
            title: item.text?.substring(0, 100) + '...' || 'Bias Analysis',
            content: item.text || '',
            result: item.result,
            bias_score: item.result?.bias_score,
            created_at: item.created_at,
            user_id: item.user_id
          })),
          ...(mediaVerifications || []).map(item => ({
            id: item.id,
            type: 'media_verification' as const,
            title: item.media_url?.split('/').pop() || 'Media Verification',
            content: item.media_url || '',
            result: item.result,
            authenticity: item.result?.authenticity,
            created_at: item.created_at,
            user_id: item.user_id
          }))
        ]

        // Sort by creation date (newest first)
        allHistory.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        
        setHistory(allHistory)
        setFilteredHistory(allHistory)
      } catch (error) {
        console.error('Error fetching history:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [])

  useEffect(() => {
    let filtered = [...history]

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by type
    if (filters.type !== 'all') {
      filtered = filtered.filter(item => item.type === filters.type)
    }

    // Filter by date range
    if (filters.dateRange !== 'all') {
      const now = new Date()
      const filterDate = new Date()
      
      switch (filters.dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          filterDate.setDate(now.getDate() - 7)
          break
        case 'month':
          filterDate.setMonth(now.getMonth() - 1)
          break
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1)
          break
      }
      
      filtered = filtered.filter(item => new Date(item.created_at) >= filterDate)
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue
      
      switch (filters.sortBy) {
        case 'title':
          aValue = a.title
          bValue = b.title
          break
        case 'type':
          aValue = a.type
          bValue = b.type
          break
        case 'score':
          aValue = a.score || a.bias_score || 0
          bValue = b.score || b.bias_score || 0
          break
        default:
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
      }
      
      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredHistory(filtered)
  }, [history, searchQuery, filters])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'fact_check':
        return <FileText className="h-4 w-4" />
      case 'bias_analysis':
        return <BarChart3 className="h-4 w-4" />
      case 'media_verification':
        return <Image className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'fact_check':
        return 'Fact Check'
      case 'bias_analysis':
        return 'Bias Analysis'
      case 'media_verification':
        return 'Media Verification'
      default:
        return 'Unknown'
    }
  }

  const getScoreBadge = (item: HistoryItem) => {
    if (item.type === 'fact_check' && item.score !== undefined) {
      const score = item.score
      if (score >= 80) return <Badge className="bg-green-100 text-green-800">High Credibility</Badge>
      if (score >= 60) return <Badge className="bg-yellow-100 text-yellow-800">Medium Credibility</Badge>
      return <Badge className="bg-red-100 text-red-800">Low Credibility</Badge>
    }
    
    if (item.type === 'bias_analysis' && item.bias_score !== undefined) {
      const score = item.bias_score
      if (score <= 20) return <Badge className="bg-green-100 text-green-800">Low Bias</Badge>
      if (score <= 60) return <Badge className="bg-yellow-100 text-yellow-800">Medium Bias</Badge>
      return <Badge className="bg-red-100 text-red-800">High Bias</Badge>
    }
    
    if (item.type === 'media_verification' && item.authenticity) {
      const auth = item.authenticity.toLowerCase()
      if (auth.includes('authentic')) return <Badge className="bg-green-100 text-green-800">Authentic</Badge>
      if (auth.includes('manipulated')) return <Badge className="bg-red-100 text-red-800">Manipulated</Badge>
      return <Badge className="bg-yellow-100 text-yellow-800">Uncertain</Badge>
    }
    
    return null
  }

  const exportHistory = () => {
    const dataStr = JSON.stringify(filteredHistory, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `truthlens-history-${new Date().toISOString().split('T')[0]}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const deleteItem = async (id: string, type: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    
    try {
      let tableName = ''
      switch (type) {
        case 'fact_check':
          tableName = 'fact_checks'
          break
        case 'bias_analysis':
          tableName = 'bias_analyses'
          break
        case 'media_verification':
          tableName = 'media_verifications'
          break
      }
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      setHistory(prev => prev.filter(item => item.id !== id))
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analysis History</h1>
              <p className="text-sm text-gray-600">View and manage your past analyses</p>
            </div>
            <Button onClick={exportHistory}>
              <Download className="h-4 w-4 mr-2" />
              Export History
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Search */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search your history..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filters.type} onValueChange={(value) => setFilters({...filters, type: value})}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="fact_check">Fact Checks</SelectItem>
                  <SelectItem value="bias_analysis">Bias Analysis</SelectItem>
                  <SelectItem value="media_verification">Media Verification</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filters.dateRange} onValueChange={(value) => setFilters({...filters, dateRange: value})}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filters.sortBy} onValueChange={(value) => setFilters({...filters, sortBy: value})}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                  <SelectItem value="score">Score</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Analyses</p>
                  <p className="text-2xl font-bold">{history.length}</p>
                </div>
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Fact Checks</p>
                  <p className="text-2xl font-bold">{history.filter(h => h.type === 'fact_check').length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Bias Analyses</p>
                  <p className="text-2xl font-bold">{history.filter(h => h.type === 'bias_analysis').length}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Media Verifications</p>
                  <p className="text-2xl font-bold">{history.filter(h => h.type === 'media_verification').length}</p>
                </div>
                <Image className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* History List */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis History</CardTitle>
            <CardDescription>
              {filteredHistory.length} of {history.length} analyses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredHistory.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No analyses found</h3>
                <p className="text-gray-600">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredHistory.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getTypeIcon(item.type)}
                          <span className="text-sm font-medium text-gray-600">
                            {getTypeLabel(item.type)}
                          </span>
                          {getScoreBadge(item)}
                        </div>
                        <h3 className="font-medium text-gray-900 mb-1">{item.title}</h3>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.content}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(item.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(item.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedItem(item)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                {getTypeIcon(item.type)}
                                {getTypeLabel(item.type)} Details
                              </DialogTitle>
                              <DialogDescription>
                                Created on {new Date(item.created_at).toLocaleString()}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium mb-2">Content</h4>
                                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{item.content}</p>
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">Analysis Result</h4>
                                <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                                  {JSON.stringify(item.result, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => copyToClipboard(item.content)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Content
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyToClipboard(JSON.stringify(item.result))}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Result
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => deleteItem(item.id, item.type)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}