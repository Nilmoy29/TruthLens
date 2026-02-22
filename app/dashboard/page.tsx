"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts"
import {
  Shield,
  Eye,
  Camera,
  TrendingUp,
  Users,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Calendar,
  Download,
  Share2,
  Settings,
  Bell
} from "lucide-react"
import { supabase } from "@/lib/supabase-client"

interface DashboardStats {
  totalAnalyses: number
  factChecks: number
  biasAnalyses: number
  mediaVerifications: number
  credibilityScore: number
  weeklyGrowth: number
  monthlyUsage: Array<{ month: string; count: number }>
  recentActivity: Array<{
    id: string
    type: string
    content: string
    score: number
    timestamp: string
  }>
}

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981']

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          // Fetch user's analysis data
          const [factChecks, biasAnalyses, mediaVerifications] = await Promise.all([
            supabase.from('fact_checks').select('*').eq('user_id', user.id),
            supabase.from('bias_analyses').select('*').eq('user_id', user.id),
            supabase.from('media_verifications').select('*').eq('user_id', user.id)
          ])

          const totalAnalyses = (factChecks.data?.length || 0) + 
                               (biasAnalyses.data?.length || 0) + 
                               (mediaVerifications.data?.length || 0)

          // Calculate average credibility score
          const credibilityScores = factChecks.data?.map(fc => fc.credibility_score).filter(Boolean) || []
          const avgCredibility = credibilityScores.length > 0 
            ? credibilityScores.reduce((a, b) => a + b, 0) / credibilityScores.length 
            : 0

          // Generate monthly usage data (mock for now)
          const monthlyUsage = [
            { month: 'Jan', count: Math.floor(Math.random() * 50) + 10 },
            { month: 'Feb', count: Math.floor(Math.random() * 50) + 15 },
            { month: 'Mar', count: Math.floor(Math.random() * 50) + 20 },
            { month: 'Apr', count: Math.floor(Math.random() * 50) + 25 },
            { month: 'May', count: Math.floor(Math.random() * 50) + 30 },
            { month: 'Jun', count: totalAnalyses }
          ]

          // Recent activity
          const allActivity = [
            ...(factChecks.data || []).map(fc => ({
              id: fc.id,
              type: 'Fact Check',
              content: fc.content?.substring(0, 50) + '...' || 'Content analyzed',
              score: fc.credibility_score || 0,
              timestamp: fc.created_at
            })),
            ...(biasAnalyses.data || []).map(ba => ({
              id: ba.id,
              type: 'Bias Analysis',
              content: ba.content?.substring(0, 50) + '...' || 'Content analyzed',
              score: ba.bias_confidence || 0,
              timestamp: ba.created_at
            })),
            ...(mediaVerifications.data || []).map(mv => ({
              id: mv.id,
              type: 'Media Verification',
              content: mv.file_name || 'Media file verified',
              score: mv.authenticity_score || 0,
              timestamp: mv.created_at
            }))
          ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5)

          setStats({
            totalAnalyses,
            factChecks: factChecks.data?.length || 0,
            biasAnalyses: biasAnalyses.data?.length || 0,
            mediaVerifications: mediaVerifications.data?.length || 0,
            credibilityScore: Math.round(avgCredibility),
            weeklyGrowth: Math.floor(Math.random() * 20) + 5, // Mock data
            monthlyUsage,
            recentActivity: allActivity
          })
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  const pieData = [
    { name: 'Fact Checks', value: stats?.factChecks || 0, color: COLORS[0] },
    { name: 'Bias Analysis', value: stats?.biasAnalyses || 0, color: COLORS[1] },
    { name: 'Media Verification', value: stats?.mediaVerifications || 0, color: COLORS[2] }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back, {user?.email || 'User'}</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalAnalyses || 0}</div>
                <p className="text-xs text-muted-foreground">
                  +{stats?.weeklyGrowth || 0}% from last week
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fact Checks</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.factChecks || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Credibility verified
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Credibility</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.credibilityScore || 0}%</div>
                <Progress value={stats?.credibilityScore || 0} className="mt-2" />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Media Verified</CardTitle>
                <Camera className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.mediaVerifications || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Authenticity checked
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Monthly Usage</CardTitle>
                <CardDescription>Your analysis activity over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats?.monthlyUsage || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Analysis Distribution</CardTitle>
                <CardDescription>Breakdown by analysis type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest analyses and verifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.recentActivity?.map((activity, index) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-gray-100">
                        {activity.type === 'Fact Check' && <Shield className="h-4 w-4 text-blue-600" />}
                        {activity.type === 'Bias Analysis' && <Eye className="h-4 w-4 text-red-600" />}
                        {activity.type === 'Media Verification' && <Camera className="h-4 w-4 text-green-600" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{activity.type}</p>
                        <p className="text-xs text-gray-600">{activity.content}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={activity.score >= 70 ? 'default' : activity.score >= 40 ? 'secondary' : 'destructive'}>
                        {activity.score}%
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No recent activity</p>
                    <p className="text-sm">Start analyzing content to see your activity here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}