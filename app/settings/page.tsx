"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
  Slider
} from "@/components/ui/slider"
import {
  Settings,
  Key,
  Bell,
  Shield,
  Database,
  Zap,
  Globe,
  Monitor,
  Smartphone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  Calendar,
  Clock,
  Target,
  Heart,
  Brain
} from "lucide-react"
import { supabase } from "@/lib/supabase-client"

interface AppSettings {
  api_keys: {
    groq_api_key?: string
    openai_api_key?: string
    custom_api_endpoint?: string
  }
  analysis_settings: {
    default_model: string
    confidence_threshold: number
    max_analysis_length: number
    enable_auto_save: boolean
    enable_real_time_analysis: boolean
  }
  notification_settings: {
    email_notifications: boolean
    push_notifications: boolean
    analysis_complete: boolean
    weekly_digest: boolean
    security_alerts: boolean
    marketing_emails: boolean
  }
  privacy_settings: {
    data_retention_days: number
    allow_analytics: boolean
    share_anonymous_data: boolean
    enable_history_sync: boolean
  }
  ui_settings: {
    theme: 'light' | 'dark' | 'system'
    language: string
    timezone: string
    compact_mode: boolean
    show_advanced_options: boolean
  }
  content_preferences: {
    preferred_content_types: string[]
    avoided_content_types: string[]
    daily_time_limit_minutes: number
    daily_article_limit: number
    daily_video_limit: number
    daily_social_limit: number
    min_credibility_score: number
    max_bias_score: number
    wellness_goals: string[]
    break_reminders_enabled: boolean
    break_interval_minutes: number
    content_categories: {
      [key: string]: { weight: number; enabled: boolean }
    }
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({
    api_keys: {},
    analysis_settings: {
      default_model: 'groq-llama',
      confidence_threshold: 70,
      max_analysis_length: 5000,
      enable_auto_save: true,
      enable_real_time_analysis: false
    },
    notification_settings: {
      email_notifications: true,
      push_notifications: true,
      analysis_complete: true,
      weekly_digest: false,
      security_alerts: true,
      marketing_emails: false
    },
    privacy_settings: {
      data_retention_days: 365,
      allow_analytics: true,
      share_anonymous_data: false,
      enable_history_sync: true
    },
    ui_settings: {
      theme: 'system',
      language: 'en',
      timezone: 'UTC',
      compact_mode: false,
      show_advanced_options: false
    },
    content_preferences: {
      preferred_content_types: ['educational', 'news', 'technology', 'science'],
      avoided_content_types: ['gossip', 'clickbait', 'conspiracy'],
      daily_time_limit_minutes: 120,
      daily_article_limit: 10,
      daily_video_limit: 5,
      daily_social_limit: 30,
      min_credibility_score: 0.70,
      max_bias_score: 0.30,
      wellness_goals: ['reduce_misinformation', 'balanced_perspective', 'time_management'],
      break_reminders_enabled: true,
      break_interval_minutes: 30,
      content_categories: {
        news: { weight: 0.3, enabled: true },
        educational: { weight: 0.4, enabled: true },
        entertainment: { weight: 0.2, enabled: true },
        social: { weight: 0.1, enabled: true }
      }
    }
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [showApiKeys, setShowApiKeys] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: userSettings } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single()

          if (userSettings) {
            setSettings({
              ...settings,
              ...userSettings.settings
            })
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error)
        setMessage({ type: 'error', text: 'Failed to load settings' })
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error } = await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            settings: settings,
            updated_at: new Date().toISOString()
          })

        if (error) throw error
        
        setMessage({ type: 'success', text: 'Settings saved successfully!' })
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const testApiConnection = async () => {
    setTestingConnection(true)
    try {
      // Test API connection with current settings
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: settings.api_keys.groq_api_key,
          endpoint: settings.api_keys.custom_api_endpoint
        })
      })
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'API connection successful!' })
      } else {
        setMessage({ type: 'error', text: 'API connection failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to test API connection' })
    } finally {
      setTestingConnection(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      setSettings({
        api_keys: {},
        analysis_settings: {
          default_model: 'groq-llama',
          confidence_threshold: 70,
          max_analysis_length: 5000,
          enable_auto_save: true,
          enable_real_time_analysis: false
        },
        notification_settings: {
          email_notifications: true,
          push_notifications: true,
          analysis_complete: true,
          weekly_digest: false,
          security_alerts: true,
          marketing_emails: false
        },
        privacy_settings: {
          data_retention_days: 365,
          allow_analytics: true,
          share_anonymous_data: false,
          enable_history_sync: true
        },
        ui_settings: {
          theme: 'system',
          language: 'en',
          timezone: 'UTC',
          compact_mode: false,
          show_advanced_options: false
        },
        content_preferences: {
          preferred_content_types: ['articles', 'news', 'technology'],
          avoided_content_types: ['clickbait', 'sensational'],
          daily_time_limit_minutes: 120,
          daily_article_limit: 10,
          daily_video_limit: 5,
          daily_social_limit: 3,
          min_credibility_score: 0.7,
          max_bias_score: 0.3,
          wellness_goals: ['reduce_misinformation', 'balanced_perspective'],
          break_reminders_enabled: true,
          break_interval_minutes: 30,
          content_categories: {
            news: { weight: 1.0, enabled: true },
            technology: { weight: 0.8, enabled: true },
            science: { weight: 0.9, enabled: true },
            health: { weight: 0.7, enabled: false }
          }
        }
      })
      setMessage({ type: 'info', text: 'Settings reset to defaults' })
    }
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-sm text-gray-600">Configure your TruthLens experience</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetToDefaults}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
              <Button onClick={handleSaveSettings} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <Alert className={`mb-6 ${
            message.type === 'error' ? 'border-red-200 bg-red-50' : 
            message.type === 'success' ? 'border-green-200 bg-green-50' :
            'border-blue-200 bg-blue-50'
          }`}>
            <AlertDescription className={`${
              message.type === 'error' ? 'text-red-800' : 
              message.type === 'success' ? 'text-green-800' :
              'text-blue-800'
            }`}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="api" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="api">API</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="interface">Interface</TabsTrigger>
          </TabsList>

          <TabsContent value="api">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    API Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure API keys and endpoints for AI analysis services
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">API Keys</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowApiKeys(!showApiKeys)}
                      >
                        {showApiKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {showApiKeys ? 'Hide' : 'Show'} Keys
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="groq_api_key">Groq API Key</Label>
                        <Input
                          id="groq_api_key"
                          type={showApiKeys ? 'text' : 'password'}
                          value={settings.api_keys.groq_api_key || ''}
                          onChange={(e) => setSettings({
                            ...settings,
                            api_keys: { ...settings.api_keys, groq_api_key: e.target.value }
                          })}
                          placeholder="Enter your Groq API key"
                        />
                        <p className="text-xs text-gray-500">
                          Get your API key from <a href="https://console.groq.com" target="_blank" className="text-blue-600 hover:underline">Groq Console</a>
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="openai_api_key">OpenAI API Key (Optional)</Label>
                        <Input
                          id="openai_api_key"
                          type={showApiKeys ? 'text' : 'password'}
                          value={settings.api_keys.openai_api_key || ''}
                          onChange={(e) => setSettings({
                            ...settings,
                            api_keys: { ...settings.api_keys, openai_api_key: e.target.value }
                          })}
                          placeholder="Enter your OpenAI API key"
                        />
                        <p className="text-xs text-gray-500">
                          Optional: For enhanced analysis capabilities
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="custom_endpoint">Custom API Endpoint (Optional)</Label>
                        <Input
                          id="custom_endpoint"
                          value={settings.api_keys.custom_api_endpoint || ''}
                          onChange={(e) => setSettings({
                            ...settings,
                            api_keys: { ...settings.api_keys, custom_api_endpoint: e.target.value }
                          })}
                          placeholder="https://api.example.com/v1"
                        />
                        <p className="text-xs text-gray-500">
                          Use a custom API endpoint for analysis
                        </p>
                      </div>
                    </div>
                    
                    <Button onClick={testApiConnection} disabled={testingConnection}>
                      {testingConnection ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      Test Connection
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="analysis">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Analysis Settings
                  </CardTitle>
                  <CardDescription>
                    Configure how TruthLens analyzes content
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Default AI Model</Label>
                      <Select
                        value={settings.analysis_settings.default_model}
                        onValueChange={(value) => setSettings({
                          ...settings,
                          analysis_settings: { ...settings.analysis_settings, default_model: value }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="groq-llama">Groq Llama 3.1 (Recommended)</SelectItem>
                          <SelectItem value="groq-mixtral">Groq Mixtral 8x7B</SelectItem>
                          <SelectItem value="openai-gpt4">OpenAI GPT-4</SelectItem>
                          <SelectItem value="openai-gpt3.5">OpenAI GPT-3.5 Turbo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Confidence Threshold: {settings.analysis_settings.confidence_threshold}%</Label>
                      <Slider
                        value={[settings.analysis_settings.confidence_threshold]}
                        onValueChange={([value]) => setSettings({
                          ...settings,
                          analysis_settings: { ...settings.analysis_settings, confidence_threshold: value }
                        })}
                        max={100}
                        min={0}
                        step={5}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500">
                        Minimum confidence level required for analysis results
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="max_length">Maximum Analysis Length (characters)</Label>
                      <Input
                        id="max_length"
                        type="number"
                        value={settings.analysis_settings.max_analysis_length}
                        onChange={(e) => setSettings({
                          ...settings,
                          analysis_settings: { ...settings.analysis_settings, max_analysis_length: parseInt(e.target.value) }
                        })}
                        min={100}
                        max={50000}
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Auto-save Results</Label>
                          <p className="text-sm text-gray-500">Automatically save analysis results to history</p>
                        </div>
                        <Switch
                          checked={settings.analysis_settings.enable_auto_save}
                          onCheckedChange={(checked) => setSettings({
                            ...settings,
                            analysis_settings: { ...settings.analysis_settings, enable_auto_save: checked }
                          })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Real-time Analysis</Label>
                          <p className="text-sm text-gray-500">Analyze content as you type (may increase API usage)</p>
                        </div>
                        <Switch
                          checked={settings.analysis_settings.enable_real_time_analysis}
                          onCheckedChange={(checked) => setSettings({
                            ...settings,
                            analysis_settings: { ...settings.analysis_settings, enable_real_time_analysis: checked }
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="content">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Content Preferences
                  </CardTitle>
                  <CardDescription>
                    Configure your healthy content consumption preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Content Types */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Content Types</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Preferred Content Types</Label>
                        <div className="flex flex-wrap gap-2">
                          {['educational', 'news', 'technology', 'science', 'health', 'finance', 'politics', 'sports'].map((type) => (
                            <Badge
                              key={type}
                              variant={settings.content_preferences.preferred_content_types.includes(type) ? 'default' : 'outline'}
                              className="cursor-pointer"
                              onClick={() => {
                                const current = settings.content_preferences.preferred_content_types
                                const updated = current.includes(type)
                                  ? current.filter(t => t !== type)
                                  : [...current, type]
                                setSettings({
                                  ...settings,
                                  content_preferences: { ...settings.content_preferences, preferred_content_types: updated }
                                })
                              }}
                            >
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Avoided Content Types</Label>
                        <div className="flex flex-wrap gap-2">
                          {['gossip', 'clickbait', 'conspiracy', 'violence', 'adult', 'gambling'].map((type) => (
                            <Badge
                              key={type}
                              variant={settings.content_preferences.avoided_content_types.includes(type) ? 'destructive' : 'outline'}
                              className="cursor-pointer"
                              onClick={() => {
                                const current = settings.content_preferences.avoided_content_types
                                const updated = current.includes(type)
                                  ? current.filter(t => t !== type)
                                  : [...current, type]
                                setSettings({
                                  ...settings,
                                  content_preferences: { ...settings.content_preferences, avoided_content_types: updated }
                                })
                              }}
                            >
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Daily Limits */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Daily Consumption Limits
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Daily Time Limit: {settings.content_preferences.daily_time_limit_minutes} minutes</Label>
                        <Slider
                          value={[settings.content_preferences.daily_time_limit_minutes]}
                          onValueChange={([value]) => setSettings({
                            ...settings,
                            content_preferences: { ...settings.content_preferences, daily_time_limit_minutes: value }
                          })}
                          max={480}
                          min={30}
                          step={15}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Articles per Day</Label>
                        <Input
                          type="number"
                          value={settings.content_preferences.daily_article_limit}
                          onChange={(e) => setSettings({
                            ...settings,
                            content_preferences: { ...settings.content_preferences, daily_article_limit: parseInt(e.target.value) }
                          })}
                          min={1}
                          max={50}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Videos per Day</Label>
                        <Input
                          type="number"
                          value={settings.content_preferences.daily_video_limit}
                          onChange={(e) => setSettings({
                            ...settings,
                            content_preferences: { ...settings.content_preferences, daily_video_limit: parseInt(e.target.value) }
                          })}
                          min={1}
                          max={20}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Social Posts per Day</Label>
                        <Input
                          type="number"
                          value={settings.content_preferences.daily_social_limit}
                          onChange={(e) => setSettings({
                            ...settings,
                            content_preferences: { ...settings.content_preferences, daily_social_limit: parseInt(e.target.value) }
                          })}
                          min={1}
                          max={100}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quality Preferences */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Content Quality
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Minimum Credibility Score: {(settings.content_preferences.min_credibility_score * 100).toFixed(0)}%</Label>
                        <Slider
                          value={[settings.content_preferences.min_credibility_score * 100]}
                          onValueChange={([value]) => setSettings({
                            ...settings,
                            content_preferences: { ...settings.content_preferences, min_credibility_score: value / 100 }
                          })}
                          max={100}
                          min={0}
                          step={5}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Maximum Bias Score: {(settings.content_preferences.max_bias_score * 100).toFixed(0)}%</Label>
                        <Slider
                          value={[settings.content_preferences.max_bias_score * 100]}
                          onValueChange={([value]) => setSettings({
                            ...settings,
                            content_preferences: { ...settings.content_preferences, max_bias_score: value / 100 }
                          })}
                          max={100}
                          min={0}
                          step={5}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Wellness Goals */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Heart className="h-5 w-5" />
                      Wellness Goals
                    </h3>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {['reduce_misinformation', 'balanced_perspective', 'time_management', 'mental_health', 'productivity', 'learning'].map((goal) => (
                          <Badge
                            key={goal}
                            variant={settings.content_preferences.wellness_goals.includes(goal) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => {
                              const current = settings.content_preferences.wellness_goals
                              const updated = current.includes(goal)
                                ? current.filter(g => g !== goal)
                                : [...current, goal]
                              setSettings({
                                ...settings,
                                content_preferences: { ...settings.content_preferences, wellness_goals: updated }
                              })
                            }}
                          >
                            {goal.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Break Reminders */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      Break Reminders
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Enable Break Reminders</Label>
                          <p className="text-sm text-gray-500">Get reminded to take breaks during content consumption</p>
                        </div>
                        <Switch
                          checked={settings.content_preferences.break_reminders_enabled}
                          onCheckedChange={(checked) => setSettings({
                            ...settings,
                            content_preferences: { ...settings.content_preferences, break_reminders_enabled: checked }
                          })}
                        />
                      </div>
                      {settings.content_preferences.break_reminders_enabled && (
                        <div className="space-y-2">
                          <Label>Break Interval: {settings.content_preferences.break_interval_minutes} minutes</Label>
                          <Slider
                            value={[settings.content_preferences.break_interval_minutes]}
                            onValueChange={([value]) => setSettings({
                              ...settings,
                              content_preferences: { ...settings.content_preferences, break_interval_minutes: value }
                            })}
                            max={120}
                            min={15}
                            step={15}
                            className="w-full"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content Categories */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Content Categories</h3>
                    <div className="space-y-4">
                      {Object.entries(settings.content_preferences.content_categories).map(([category, config]) => (
                        <div key={category} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={config.enabled}
                              onCheckedChange={(checked) => setSettings({
                                ...settings,
                                content_preferences: {
                                  ...settings.content_preferences,
                                  content_categories: {
                                    ...settings.content_preferences.content_categories,
                                    [category]: { ...config, enabled: checked }
                                  }
                                }
                              })}
                            />
                            <div>
                              <Label className="capitalize">{category}</Label>
                              <p className="text-sm text-gray-500">Weight: {(config.weight * 100).toFixed(0)}%</p>
                            </div>
                          </div>
                          <div className="w-32">
                            <Slider
                              value={[config.weight * 100]}
                              onValueChange={([value]) => setSettings({
                                ...settings,
                                content_preferences: {
                                  ...settings.content_preferences,
                                  content_categories: {
                                    ...settings.content_preferences.content_categories,
                                    [category]: { ...config, weight: value / 100 }
                                  }
                                }
                              })}
                              max={100}
                              min={0}
                              step={5}
                              disabled={!config.enabled}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="notifications">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Settings
                  </CardTitle>
                  <CardDescription>
                    Choose how and when you want to be notified
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Email Notifications</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Email Notifications</Label>
                          <p className="text-sm text-gray-500">Receive email updates</p>
                        </div>
                        <Switch
                          checked={settings.notification_settings.email_notifications}
                          onCheckedChange={(checked) => setSettings({
                            ...settings,
                            notification_settings: { ...settings.notification_settings, email_notifications: checked }
                          })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Analysis Complete</Label>
                          <p className="text-sm text-gray-500">Get notified when analysis is finished</p>
                        </div>
                        <Switch
                          checked={settings.notification_settings.analysis_complete}
                          onCheckedChange={(checked) => setSettings({
                            ...settings,
                            notification_settings: { ...settings.notification_settings, analysis_complete: checked }
                          })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Weekly Digest</Label>
                          <p className="text-sm text-gray-500">Weekly summary of your activity</p>
                        </div>
                        <Switch
                          checked={settings.notification_settings.weekly_digest}
                          onCheckedChange={(checked) => setSettings({
                            ...settings,
                            notification_settings: { ...settings.notification_settings, weekly_digest: checked }
                          })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Security Alerts</Label>
                          <p className="text-sm text-gray-500">Important security notifications</p>
                        </div>
                        <Switch
                          checked={settings.notification_settings.security_alerts}
                          onCheckedChange={(checked) => setSettings({
                            ...settings,
                            notification_settings: { ...settings.notification_settings, security_alerts: checked }
                          })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Marketing Emails</Label>
                          <p className="text-sm text-gray-500">Product updates and promotions</p>
                        </div>
                        <Switch
                          checked={settings.notification_settings.marketing_emails}
                          onCheckedChange={(checked) => setSettings({
                            ...settings,
                            notification_settings: { ...settings.notification_settings, marketing_emails: checked }
                          })}
                        />
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-medium">Push Notifications</h3>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Browser Push Notifications</Label>
                        <p className="text-sm text-gray-500">Get notified in your browser</p>
                      </div>
                      <Switch
                        checked={settings.notification_settings.push_notifications}
                        onCheckedChange={(checked) => setSettings({
                          ...settings,
                          notification_settings: { ...settings.notification_settings, push_notifications: checked }
                        })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="privacy">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Privacy & Data
                  </CardTitle>
                  <CardDescription>
                    Control how your data is stored and used
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Data Retention Period: {settings.privacy_settings.data_retention_days} days</Label>
                      <Slider
                        value={[settings.privacy_settings.data_retention_days]}
                        onValueChange={([value]) => setSettings({
                          ...settings,
                          privacy_settings: { ...settings.privacy_settings, data_retention_days: value }
                        })}
                        max={1095}
                        min={30}
                        step={30}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500">
                        How long to keep your analysis history (30 days to 3 years)
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Allow Analytics</Label>
                          <p className="text-sm text-gray-500">Help us improve TruthLens with usage analytics</p>
                        </div>
                        <Switch
                          checked={settings.privacy_settings.allow_analytics}
                          onCheckedChange={(checked) => setSettings({
                            ...settings,
                            privacy_settings: { ...settings.privacy_settings, allow_analytics: checked }
                          })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Share Anonymous Data</Label>
                          <p className="text-sm text-gray-500">Share anonymized data for research purposes</p>
                        </div>
                        <Switch
                          checked={settings.privacy_settings.share_anonymous_data}
                          onCheckedChange={(checked) => setSettings({
                            ...settings,
                            privacy_settings: { ...settings.privacy_settings, share_anonymous_data: checked }
                          })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Enable History Sync</Label>
                          <p className="text-sm text-gray-500">Sync your analysis history across devices</p>
                        </div>
                        <Switch
                          checked={settings.privacy_settings.enable_history_sync}
                          onCheckedChange={(checked) => setSettings({
                            ...settings,
                            privacy_settings: { ...settings.privacy_settings, enable_history_sync: checked }
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="interface">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Interface Settings
                  </CardTitle>
                  <CardDescription>
                    Customize the look and feel of TruthLens
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Theme</Label>
                        <Select
                          value={settings.ui_settings.theme}
                          onValueChange={(value: 'light' | 'dark' | 'system') => setSettings({
                            ...settings,
                            ui_settings: { ...settings.ui_settings, theme: value }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="system">System</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Language</Label>
                        <Select
                          value={settings.ui_settings.language}
                          onValueChange={(value) => setSettings({
                            ...settings,
                            ui_settings: { ...settings.ui_settings, language: value }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Español</SelectItem>
                            <SelectItem value="fr">Français</SelectItem>
                            <SelectItem value="de">Deutsch</SelectItem>
                            <SelectItem value="zh">中文</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Timezone</Label>
                      <Select
                        value={settings.ui_settings.timezone}
                        onValueChange={(value) => setSettings({
                          ...settings,
                          ui_settings: { ...settings.ui_settings, timezone: value }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="America/New_York">Eastern Time</SelectItem>
                          <SelectItem value="America/Chicago">Central Time</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                          <SelectItem value="Europe/London">London</SelectItem>
                          <SelectItem value="Europe/Paris">Paris</SelectItem>
                          <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Compact Mode</Label>
                          <p className="text-sm text-gray-500">Use a more compact interface layout</p>
                        </div>
                        <Switch
                          checked={settings.ui_settings.compact_mode}
                          onCheckedChange={(checked) => setSettings({
                            ...settings,
                            ui_settings: { ...settings.ui_settings, compact_mode: checked }
                          })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Show Advanced Options</Label>
                          <p className="text-sm text-gray-500">Display advanced configuration options</p>
                        </div>
                        <Switch
                          checked={settings.ui_settings.show_advanced_options}
                          onCheckedChange={(checked) => setSettings({
                            ...settings,
                            ui_settings: { ...settings.ui_settings, show_advanced_options: checked }
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}