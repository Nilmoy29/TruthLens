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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Bell,
  Eye,
  Lock,
  CreditCard,
  Download,
  Trash2,
  Save,
  Camera,
  Settings,
  Crown
} from "lucide-react"
import { supabase } from "@/lib/supabase-client"

interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  phone?: string
  location?: string
  bio?: string
  website?: string
  created_at: string
  subscription_tier?: 'free' | 'pro' | 'enterprise'
  preferences: {
    email_notifications: boolean
    push_notifications: boolean
    weekly_digest: boolean
    security_alerts: boolean
    theme: 'light' | 'dark' | 'system'
    language: string
    timezone: string
  }
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [activeTab, setActiveTab] = useState("profile")

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Try to get existing profile
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (existingProfile) {
            setProfile({
              ...existingProfile,
              email: user.email || '',
              preferences: existingProfile.preferences || {
                email_notifications: true,
                push_notifications: true,
                weekly_digest: false,
                security_alerts: true,
                theme: 'system',
                language: 'en',
                timezone: 'UTC'
              }
            })
          } else {
            // Create default profile
            const defaultProfile: UserProfile = {
              id: user.id,
              email: user.email || '',
              created_at: new Date().toISOString(),
              subscription_tier: 'free',
              preferences: {
                email_notifications: true,
                push_notifications: true,
                weekly_digest: false,
                security_alerts: true,
                theme: 'system',
                language: 'en',
                timezone: 'UTC'
              }
            }
            setProfile(defaultProfile)
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
        setMessage({ type: 'error', text: 'Failed to load profile' })
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handleSaveProfile = async () => {
    if (!profile) return
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          phone: profile.phone,
          location: profile.location,
          bio: profile.bio,
          website: profile.website,
          subscription_tier: profile.subscription_tier,
          preferences: profile.preferences,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error saving profile:', error)
      setMessage({ type: 'error', text: 'Failed to save profile' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }
    
    try {
      // In a real app, you'd want to handle this more carefully
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Redirect to home page
      window.location.href = '/'
    } catch (error) {
      console.error('Error deleting account:', error)
      setMessage({ type: 'error', text: 'Failed to delete account' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile not found</h2>
          <p className="text-gray-600">Unable to load your profile information.</p>
        </div>
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
              <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
              <p className="text-sm text-gray-600">Manage your account and preferences</p>
            </div>
            <Button onClick={handleSaveProfile} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <Alert className={`mb-6 ${message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
            <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Update your personal details and profile information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar Section */}
                  <div className="flex items-center gap-6">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={profile.avatar_url} />
                      <AvatarFallback className="text-lg">
                        {profile.full_name?.charAt(0) || profile.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Button variant="outline" size="sm">
                        <Camera className="h-4 w-4 mr-2" />
                        Change Photo
                      </Button>
                      <p className="text-xs text-gray-500 mt-1">JPG, PNG or GIF. Max size 2MB.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={profile.full_name || ''}
                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={profile.email}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={profile.phone || ''}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={profile.location || ''}
                        onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                        placeholder="City, Country"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={profile.website || ''}
                      onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={profile.bio || ''}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      placeholder="Tell us about yourself..."
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="preferences">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Preferences</CardTitle>
                  <CardDescription>Customize your experience and notification settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Notifications */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Notifications</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Email Notifications</Label>
                          <p className="text-sm text-gray-500">Receive email updates about your analyses</p>
                        </div>
                        <Switch
                          checked={profile.preferences.email_notifications}
                          onCheckedChange={(checked) => 
                            setProfile({
                              ...profile,
                              preferences: { ...profile.preferences, email_notifications: checked }
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Push Notifications</Label>
                          <p className="text-sm text-gray-500">Get notified about important updates</p>
                        </div>
                        <Switch
                          checked={profile.preferences.push_notifications}
                          onCheckedChange={(checked) => 
                            setProfile({
                              ...profile,
                              preferences: { ...profile.preferences, push_notifications: checked }
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Weekly Digest</Label>
                          <p className="text-sm text-gray-500">Weekly summary of your activity</p>
                        </div>
                        <Switch
                          checked={profile.preferences.weekly_digest}
                          onCheckedChange={(checked) => 
                            setProfile({
                              ...profile,
                              preferences: { ...profile.preferences, weekly_digest: checked }
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Security Alerts</Label>
                          <p className="text-sm text-gray-500">Important security notifications</p>
                        </div>
                        <Switch
                          checked={profile.preferences.security_alerts}
                          onCheckedChange={(checked) => 
                            setProfile({
                              ...profile,
                              preferences: { ...profile.preferences, security_alerts: checked }
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Appearance */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Appearance</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Theme</Label>
                        <Select
                          value={profile.preferences.theme}
                          onValueChange={(value: 'light' | 'dark' | 'system') => 
                            setProfile({
                              ...profile,
                              preferences: { ...profile.preferences, theme: value }
                            })
                          }
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
                          value={profile.preferences.language}
                          onValueChange={(value) => 
                            setProfile({
                              ...profile,
                              preferences: { ...profile.preferences, language: value }
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Español</SelectItem>
                            <SelectItem value="fr">Français</SelectItem>
                            <SelectItem value="de">Deutsch</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="subscription">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Subscription</CardTitle>
                  <CardDescription>Manage your subscription and billing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-blue-100">
                        {profile.subscription_tier === 'pro' ? (
                          <Crown className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Shield className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium capitalize">{profile.subscription_tier || 'Free'} Plan</h3>
                        <p className="text-sm text-gray-500">
                          {profile.subscription_tier === 'pro' 
                            ? 'Advanced features and priority support'
                            : 'Basic features with limited usage'
                          }
                        </p>
                      </div>
                    </div>
                    <Badge variant={profile.subscription_tier === 'pro' ? 'default' : 'secondary'}>
                      {profile.subscription_tier === 'pro' ? 'Active' : 'Free'}
                    </Badge>
                  </div>

                  {profile.subscription_tier === 'free' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Upgrade to Pro</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2">Pro Monthly</h4>
                          <p className="text-2xl font-bold mb-2">$19<span className="text-sm font-normal">/month</span></p>
                          <ul className="text-sm text-gray-600 space-y-1 mb-4">
                            <li>• Unlimited analyses</li>
                            <li>• Advanced AI models</li>
                            <li>• Priority support</li>
                            <li>• Export capabilities</li>
                          </ul>
                          <Button className="w-full">
                            <CreditCard className="h-4 w-4 mr-2" />
                            Upgrade Now
                          </Button>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2">Pro Yearly</h4>
                          <p className="text-2xl font-bold mb-2">$190<span className="text-sm font-normal">/year</span></p>
                          <p className="text-sm text-green-600 mb-2">Save 17%</p>
                          <ul className="text-sm text-gray-600 space-y-1 mb-4">
                            <li>• Everything in Pro Monthly</li>
                            <li>• 2 months free</li>
                            <li>• Annual reporting</li>
                            <li>• Custom integrations</li>
                          </ul>
                          <Button className="w-full" variant="outline">
                            <CreditCard className="h-4 w-4 mr-2" />
                            Upgrade Yearly
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {profile.subscription_tier === 'pro' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Billing Information</h3>
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Next billing date</span>
                          <span className="text-sm text-gray-600">January 15, 2024</span>
                        </div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="font-medium">Amount</span>
                          <span className="text-sm text-gray-600">$19.00</span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Download Invoice
                          </Button>
                          <Button variant="outline" size="sm">
                            Update Payment Method
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="security">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>Manage your account security and privacy</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Password</h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="current_password">Current Password</Label>
                          <Input id="current_password" type="password" placeholder="Enter current password" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new_password">New Password</Label>
                          <Input id="new_password" type="password" placeholder="Enter new password" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirm_password">Confirm New Password</Label>
                          <Input id="confirm_password" type="password" placeholder="Confirm new password" />
                        </div>
                        <Button>
                          <Lock className="h-4 w-4 mr-2" />
                          Update Password
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">Authenticator App</h4>
                          <p className="text-sm text-gray-500">Use an authenticator app to generate verification codes</p>
                        </div>
                        <Button variant="outline">
                          Enable 2FA
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Active Sessions</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h4 className="font-medium">Current Session</h4>
                            <p className="text-sm text-gray-500">MacOS • Chrome • San Francisco, CA</p>
                          </div>
                          <Badge variant="secondary">Active</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600">Danger Zone</CardTitle>
                    <CardDescription>Irreversible and destructive actions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                        <div>
                          <h4 className="font-medium text-red-900">Delete Account</h4>
                          <p className="text-sm text-red-700">Permanently delete your account and all associated data</p>
                        </div>
                        <Button variant="destructive" onClick={handleDeleteAccount}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Account
                        </Button>
                      </div>
                    </div>
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