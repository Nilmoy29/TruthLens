"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Users,
  BarChart3,
  Shield,
  Server,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Eye,
  Edit,
  Trash2,
  Ban,
  UserCheck,
  Download,
  RefreshCw,
  Search,
  Filter
} from "lucide-react"
import { supabase } from "@/lib/supabase-client"

interface User {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string
  email_confirmed_at: string
  role: 'user' | 'admin'
  status: 'active' | 'suspended' | 'pending'
  total_analyses: number
  subscription_tier: 'free' | 'pro' | 'enterprise'
}

interface SystemMetrics {
  total_users: number
  active_users_24h: number
  total_analyses: number
  analyses_24h: number
  api_calls_24h: number
  error_rate: number
  avg_response_time: number
  storage_used: number
}

interface AnalyticsData {
  date: string
  users: number
  analyses: number
  api_calls: number
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [metrics, setMetrics] = useState<SystemMetrics>({
    total_users: 0,
    active_users_24h: 0,
    total_analyses: 0,
    analyses_24h: 0,
    api_calls_24h: 0,
    error_rate: 0,
    avg_response_time: 0,
    storage_used: 0
  })
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        // Check if user is admin
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          window.location.href = '/auth/login'
          return
        }

        // Load users data
        const { data: usersData } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })

        if (usersData) {
          setUsers(usersData.map(user => ({
            id: user.id,
            email: user.email || 'N/A',
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at || user.created_at,
            email_confirmed_at: user.email_confirmed_at || user.created_at,
            role: user.role || 'user',
            status: user.status || 'active',
            total_analyses: user.total_analyses || 0,
            subscription_tier: user.subscription_tier || 'free'
          })))
        }

        // Load system metrics
        const { data: analysesData } = await supabase
          .from('fact_checks')
          .select('created_at')

        const { data: biasData } = await supabase
          .from('bias_analyses')
          .select('created_at')

        const { data: mediaData } = await supabase
          .from('media_verifications')
          .select('created_at')

        const totalAnalyses = (analysesData?.length || 0) + (biasData?.length || 0) + (mediaData?.length || 0)
        const now = new Date()
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

        const analyses24h = [
          ...(analysesData || []),
          ...(biasData || []),
          ...(mediaData || [])
        ].filter(item => new Date(item.created_at) > yesterday).length

        setMetrics({
          total_users: usersData?.length || 0,
          active_users_24h: Math.floor((usersData?.length || 0) * 0.3), // Mock data
          total_analyses: totalAnalyses,
          analyses_24h: analyses24h,
          api_calls_24h: analyses24h * 3, // Estimate
          error_rate: 2.1, // Mock data
          avg_response_time: 1.2, // Mock data
          storage_used: 45.7 // Mock data
        })

        // Generate mock analytics data for the last 7 days
        const analyticsData: AnalyticsData[] = []
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
          analyticsData.push({
            date: date.toISOString().split('T')[0],
            users: Math.floor(Math.random() * 50) + 20,
            analyses: Math.floor(Math.random() * 100) + 30,
            api_calls: Math.floor(Math.random() * 300) + 100
          })
        }
        setAnalytics(analyticsData)

      } catch (error) {
        console.error('Error loading admin data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAdminData()
  }, [])

  const handleUserAction = async (userId: string, action: 'suspend' | 'activate' | 'delete' | 'make_admin') => {
    setActionLoading(true)
    try {
      let updateData: any = {}
      
      switch (action) {
        case 'suspend':
          updateData = { status: 'suspended' }
          break
        case 'activate':
          updateData = { status: 'active' }
          break
        case 'make_admin':
          updateData = { role: 'admin' }
          break
        case 'delete':
          // In a real app, you'd want to soft delete or archive
          const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId)
          
          if (!error) {
            setUsers(users.filter(u => u.id !== userId))
          }
          return
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)

      if (!error) {
        setUsers(users.map(u => 
          u.id === userId ? { ...u, ...updateData } : u
        ))
      }
    } catch (error) {
      console.error('Error updating user:', error)
    } finally {
      setActionLoading(false)
      setSelectedUser(null)
    }
  }

  const exportData = async (type: 'users' | 'analytics') => {
    try {
      let data: any[] = []
      let filename = ''
      
      if (type === 'users') {
        data = users
        filename = 'users_export.json'
      } else {
        data = analytics
        filename = 'analytics_export.json'
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting data:', error)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter
    return matchesSearch && matchesStatus
  })

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
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">System monitoring and user management</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => exportData('analytics')}>
                <Download className="h-4 w-4 mr-2" />
                Export Analytics
              </Button>
              <Button variant="outline" onClick={() => exportData('users')}>
                <Download className="h-4 w-4 mr-2" />
                Export Users
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.total_users.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-green-600">+{metrics.active_users_24h}</span> active in 24h
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.total_analyses.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-green-600">+{metrics.analyses_24h}</span> in 24h
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">API Calls (24h)</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.api_calls_24h.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-red-600">{metrics.error_rate}%</span> error rate
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Response Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.avg_response_time}s</div>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-green-600">-0.2s</span> from yesterday
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest system events and user actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">New user registration</p>
                        <p className="text-xs text-gray-500">user@example.com - 2 minutes ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Fact check analysis completed</p>
                        <p className="text-xs text-gray-500">High confidence result - 5 minutes ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">API rate limit warning</p>
                        <p className="text-xs text-gray-500">User approaching daily limit - 10 minutes ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Failed analysis attempt</p>
                        <p className="text-xs text-gray-500">Invalid API key - 15 minutes ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="users">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* User Management Controls */}
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Manage user accounts and permissions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search users by email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Subscription</TableHead>
                          <TableHead>Analyses</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{user.email}</div>
                                <div className="text-sm text-gray-500">{user.id.slice(0, 8)}...</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.status === 'active' ? 'default' : user.status === 'suspended' ? 'destructive' : 'secondary'}>
                                {user.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.subscription_tier === 'enterprise' ? 'default' : user.subscription_tier === 'pro' ? 'secondary' : 'outline'}>
                                {user.subscription_tier}
                              </Badge>
                            </TableCell>
                            <TableCell>{user.total_analyses}</TableCell>
                            <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" onClick={() => setSelectedUser(user)}>
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>User Details</DialogTitle>
                                      <DialogDescription>
                                        Manage user account and permissions
                                      </DialogDescription>
                                    </DialogHeader>
                                    {selectedUser && (
                                      <div className="space-y-4">
                                        <div>
                                          <Label>Email</Label>
                                          <p className="text-sm">{selectedUser.email}</p>
                                        </div>
                                        <div>
                                          <Label>User ID</Label>
                                          <p className="text-sm font-mono">{selectedUser.id}</p>
                                        </div>
                                        <div>
                                          <Label>Status</Label>
                                          <p className="text-sm">{selectedUser.status}</p>
                                        </div>
                                        <div>
                                          <Label>Role</Label>
                                          <p className="text-sm">{selectedUser.role}</p>
                                        </div>
                                        <div>
                                          <Label>Total Analyses</Label>
                                          <p className="text-sm">{selectedUser.total_analyses}</p>
                                        </div>
                                        <div>
                                          <Label>Last Sign In</Label>
                                          <p className="text-sm">{new Date(selectedUser.last_sign_in_at).toLocaleString()}</p>
                                        </div>
                                      </div>
                                    )}
                                    <DialogFooter className="flex gap-2">
                                      {selectedUser?.status === 'active' ? (
                                        <Button
                                          variant="destructive"
                                          onClick={() => handleUserAction(selectedUser.id, 'suspend')}
                                          disabled={actionLoading}
                                        >
                                          <Ban className="h-4 w-4 mr-2" />
                                          Suspend
                                        </Button>
                                      ) : (
                                        <Button
                                          variant="default"
                                          onClick={() => handleUserAction(selectedUser.id, 'activate')}
                                          disabled={actionLoading}
                                        >
                                          <UserCheck className="h-4 w-4 mr-2" />
                                          Activate
                                        </Button>
                                      )}
                                      {selectedUser?.role !== 'admin' && (
                                        <Button
                                          variant="outline"
                                          onClick={() => handleUserAction(selectedUser.id, 'make_admin')}
                                          disabled={actionLoading}
                                        >
                                          <Shield className="h-4 w-4 mr-2" />
                                          Make Admin
                                        </Button>
                                      )}
                                      <Button
                                        variant="destructive"
                                        onClick={() => {
                                          if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
                                            handleUserAction(selectedUser.id, 'delete')
                                          }
                                        }}
                                        disabled={actionLoading}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="analytics">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Usage Analytics</CardTitle>
                  <CardDescription>System usage trends and statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{analytics.reduce((sum, day) => sum + day.users, 0)}</div>
                        <div className="text-sm text-gray-500">Total Active Users (7 days)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{analytics.reduce((sum, day) => sum + day.analyses, 0)}</div>
                        <div className="text-sm text-gray-500">Total Analyses (7 days)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{analytics.reduce((sum, day) => sum + day.api_calls, 0)}</div>
                        <div className="text-sm text-gray-500">Total API Calls (7 days)</div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Daily Activity (Last 7 Days)</h3>
                      <div className="space-y-2">
                        {analytics.map((day, index) => (
                          <div key={day.date} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm font-medium">{new Date(day.date).toLocaleDateString()}</div>
                            <div className="flex gap-4 text-sm">
                              <span className="text-blue-600">{day.users} users</span>
                              <span className="text-green-600">{day.analyses} analyses</span>
                              <span className="text-purple-600">{day.api_calls} API calls</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="system">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5" />
                      System Health
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">API Status</span>
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Operational
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Database</span>
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Healthy
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Storage</span>
                      <Badge variant="secondary">
                        {metrics.storage_used}% used
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Error Rate</span>
                      <Badge variant={metrics.error_rate > 5 ? 'destructive' : 'default'}>
                        {metrics.error_rate}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      System Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        High API usage detected. Consider scaling resources.
                      </AlertDescription>
                    </Alert>
                    <Alert>
                      <AlertDescription>
                        Database backup completed successfully at 2:00 AM.
                      </AlertDescription>
                    </Alert>
                    <Alert>
                      <AlertDescription>
                        SSL certificate expires in 30 days. Renewal required.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}