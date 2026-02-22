"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Search,
  HelpCircle,
  MessageCircle,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  AlertCircle,
  Book,
  Video,
  FileText,
  Users,
  Zap,
  Shield,
  BarChart3,
  Settings,
  CreditCard,
  Globe,
  Send,
  ExternalLink
} from "lucide-react"
import { supabase } from "@/lib/supabase-client"

interface FAQ {
  id: string
  question: string
  answer: string
  category: string
  helpful: number
}

interface SupportTicket {
  subject: string
  category: string
  priority: string
  description: string
  email: string
  name: string
}

const faqs: FAQ[] = [
  {
    id: '1',
    question: 'How accurate is TruthLens fact-checking?',
    answer: 'TruthLens uses advanced AI models trained on verified data sources to provide fact-checking with typically 85-95% accuracy. Our system cross-references multiple reliable sources and provides confidence scores for each analysis.',
    category: 'fact-checking',
    helpful: 42
  },
  {
    id: '2',
    question: 'What sources does TruthLens use for verification?',
    answer: 'We use a curated database of trusted sources including major news outlets, academic institutions, government databases, and fact-checking organizations like Snopes, PolitiFact, and FactCheck.org.',
    category: 'fact-checking',
    helpful: 38
  },
  {
    id: '3',
    question: 'How does bias analysis work?',
    answer: 'Our bias analysis examines language patterns, source selection, framing, and emotional language to identify potential political, cultural, or ideological biases in content. It provides a detailed breakdown of detected bias types and severity.',
    category: 'bias-analysis',
    helpful: 35
  },
  {
    id: '4',
    question: 'Can TruthLens verify images and videos?',
    answer: 'Yes, our media verification feature can detect manipulated images, deepfakes, and altered videos using computer vision and machine learning techniques. It also performs reverse image searches to find original sources.',
    category: 'media-verification',
    helpful: 29
  },
  {
    id: '5',
    question: 'What are the API rate limits?',
    answer: 'Rate limits depend on your subscription: Free (50 calls/month), Pro (2,000 calls/month), Enterprise (50,000 calls/month). Rate limits reset monthly and unused calls do not roll over.',
    category: 'api',
    helpful: 31
  },
  {
    id: '6',
    question: 'How do I upgrade my subscription?',
    answer: 'You can upgrade your subscription anytime from your account settings or the pricing page. Upgrades take effect immediately, and you\'ll be charged the prorated amount for the current billing period.',
    category: 'billing',
    helpful: 26
  },
  {
    id: '7',
    question: 'Is my data secure and private?',
    answer: 'Yes, we use enterprise-grade encryption for data in transit and at rest. We do not store or share your analyzed content beyond the necessary processing time, and we comply with GDPR and other privacy regulations.',
    category: 'privacy',
    helpful: 44
  },
  {
    id: '8',
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes, you can cancel your subscription at any time from your account settings. You\'ll continue to have access to your plan features until the end of your current billing period.',
    category: 'billing',
    helpful: 22
  }
]

const categories = [
  { id: 'all', name: 'All Categories', icon: HelpCircle },
  { id: 'fact-checking', name: 'Fact Checking', icon: CheckCircle },
  { id: 'bias-analysis', name: 'Bias Analysis', icon: BarChart3 },
  { id: 'media-verification', name: 'Media Verification', icon: Video },
  { id: 'api', name: 'API & Integration', icon: Zap },
  { id: 'billing', name: 'Billing & Plans', icon: CreditCard },
  { id: 'privacy', name: 'Privacy & Security', icon: Shield },
  { id: 'account', name: 'Account Settings', icon: Settings }
]

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [supportForm, setSupportForm] = useState<SupportTicket>({
    subject: '',
    category: '',
    priority: '',
    description: '',
    email: '',
    name: ''
  })
  const [submittingTicket, setSubmittingTicket] = useState(false)
  const [ticketSubmitted, setTicketSubmitted] = useState(false)

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingTicket(true)

    try {
      // In a real app, you would send this to your support system
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate API call
      
      // You could also save to Supabase
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          ...supportForm,
          status: 'open',
          created_at: new Date().toISOString()
        })

      setTicketSubmitted(true)
      setSupportForm({
        subject: '',
        category: '',
        priority: '',
        description: '',
        email: '',
        name: ''
      })
    } catch (error) {
      console.error('Error submitting support ticket:', error)
      alert('Failed to submit support ticket. Please try again.')
    } finally {
      setSubmittingTicket(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Help Center
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Find answers to common questions, browse our documentation, or get in touch with our support team.
              </p>
              
              {/* Search Bar */}
              <div className="max-w-2xl mx-auto">
                <div className="relative">
                  <Search className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Search for help articles, FAQs, or guides..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 pr-4 py-4 text-lg border-gray-300 rounded-lg shadow-sm"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Tabs defaultValue="faq" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="guides">Guides</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
          </TabsList>

          <TabsContent value="faq">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Category Filter */}
              <Card>
                <CardHeader>
                  <CardTitle>Browse by Category</CardTitle>
                  <CardDescription>Find answers organized by topic</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {categories.map((category) => {
                      const Icon = category.icon
                      return (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id)}
                          className={`p-4 rounded-lg border text-left transition-colors ${
                            selectedCategory === category.id
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className="h-5 w-5 mb-2" />
                          <div className="font-medium text-sm">{category.name}</div>
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* FAQ List */}
              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                  <CardDescription>
                    {filteredFAQs.length} questions found
                    {selectedCategory !== 'all' && ` in ${categories.find(c => c.id === selectedCategory)?.name}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="space-y-4">
                    {filteredFAQs.map((faq) => (
                      <AccordionItem key={faq.id} value={faq.id} className="border rounded-lg px-4">
                        <AccordionTrigger className="text-left hover:no-underline">
                          <div className="flex items-start justify-between w-full">
                            <span className="font-medium">{faq.question}</span>
                            <Badge variant="secondary" className="ml-4 text-xs">
                              {faq.helpful} helpful
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-600 pb-4">
                          <p>{faq.answer}</p>
                          <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                            <span className="text-sm text-gray-500">Was this helpful?</span>
                            <Button variant="outline" size="sm">
                              👍 Yes
                            </Button>
                            <Button variant="outline" size="sm">
                              👎 No
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                  
                  {filteredFAQs.length === 0 && (
                    <div className="text-center py-8">
                      <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                      <p className="text-gray-600">Try adjusting your search or browse different categories.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="guides">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Book className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Getting Started</CardTitle>
                        <CardDescription>Learn the basics</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <ExternalLink className="h-3 w-3" />
                        <span>Setting up your account</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <ExternalLink className="h-3 w-3" />
                        <span>Your first fact check</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <ExternalLink className="h-3 w-3" />
                        <span>Understanding results</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Zap className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">API Documentation</CardTitle>
                        <CardDescription>Developer resources</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <ExternalLink className="h-3 w-3" />
                        <span>API Reference</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <ExternalLink className="h-3 w-3" />
                        <span>Authentication</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <ExternalLink className="h-3 w-3" />
                        <span>Code examples</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Video className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Video Tutorials</CardTitle>
                        <CardDescription>Step-by-step guides</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <ExternalLink className="h-3 w-3" />
                        <span>Platform overview</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <ExternalLink className="h-3 w-3" />
                        <span>Advanced features</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <ExternalLink className="h-3 w-3" />
                        <span>Best practices</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <Shield className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Security & Privacy</CardTitle>
                        <CardDescription>Keep your data safe</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <ExternalLink className="h-3 w-3" />
                        <span>Data protection</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <ExternalLink className="h-3 w-3" />
                        <span>Privacy policy</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <ExternalLink className="h-3 w-3" />
                        <span>Security measures</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <BarChart3 className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Advanced Analytics</CardTitle>
                        <CardDescription>Deep insights</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <ExternalLink className="h-3 w-3" />
                        <span>Understanding metrics</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <ExternalLink className="h-3 w-3" />
                        <span>Custom reports</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <ExternalLink className="h-3 w-3" />
                        <span>Data export</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Users className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Team Management</CardTitle>
                        <CardDescription>Collaborate effectively</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <ExternalLink className="h-3 w-3" />
                        <span>Adding team members</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <ExternalLink className="h-3 w-3" />
                        <span>Role permissions</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <ExternalLink className="h-3 w-3" />
                        <span>Sharing results</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="contact">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Contact Options */}
                <Card>
                  <CardHeader>
                    <CardTitle>Get in Touch</CardTitle>
                    <CardDescription>Choose the best way to reach our support team</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <MessageCircle className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">Live Chat</h3>
                        <p className="text-sm text-gray-600 mb-2">Get instant help from our support team</p>
                        <p className="text-xs text-gray-500">Available 9 AM - 6 PM EST</p>
                        <Button size="sm" className="mt-2">
                          Start Chat
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Mail className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">Email Support</h3>
                        <p className="text-sm text-gray-600 mb-2">Send us a detailed message</p>
                        <p className="text-xs text-gray-500">Response within 24 hours</p>
                        <p className="text-sm font-mono mt-1">support@truthlens.ai</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Phone className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">Phone Support</h3>
                        <p className="text-sm text-gray-600 mb-2">Speak directly with our team</p>
                        <p className="text-xs text-gray-500">Enterprise customers only</p>
                        <p className="text-sm font-mono mt-1">+1 (555) 123-4567</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">Emergency Support</h3>
                        <p className="text-sm text-gray-600 mb-2">Critical issues and outages</p>
                        <p className="text-xs text-gray-500">24/7 availability</p>
                        <p className="text-sm font-mono mt-1">emergency@truthlens.ai</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Support Form */}
                <Card>
                  <CardHeader>
                    <CardTitle>Submit a Support Ticket</CardTitle>
                    <CardDescription>Describe your issue and we'll get back to you soon</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {ticketSubmitted ? (
                      <div className="text-center py-8">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Ticket Submitted!</h3>
                        <p className="text-gray-600 mb-4">
                          We've received your support request and will respond within 24 hours.
                        </p>
                        <Button onClick={() => setTicketSubmitted(false)}>
                          Submit Another Ticket
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleSupportSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="name">Name</Label>
                            <Input
                              id="name"
                              value={supportForm.name}
                              onChange={(e) => setSupportForm({...supportForm, name: e.target.value})}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              value={supportForm.email}
                              onChange={(e) => setSupportForm({...supportForm, email: e.target.value})}
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="subject">Subject</Label>
                          <Input
                            id="subject"
                            value={supportForm.subject}
                            onChange={(e) => setSupportForm({...supportForm, subject: e.target.value})}
                            required
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="category">Category</Label>
                            <Select value={supportForm.category} onValueChange={(value) => setSupportForm({...supportForm, category: value})}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="technical">Technical Issue</SelectItem>
                                <SelectItem value="billing">Billing Question</SelectItem>
                                <SelectItem value="feature">Feature Request</SelectItem>
                                <SelectItem value="bug">Bug Report</SelectItem>
                                <SelectItem value="account">Account Issue</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="priority">Priority</Label>
                            <Select value={supportForm.priority} onValueChange={(value) => setSupportForm({...supportForm, priority: value})}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            rows={6}
                            value={supportForm.description}
                            onChange={(e) => setSupportForm({...supportForm, description: e.target.value})}
                            placeholder="Please describe your issue in detail..."
                            required
                          />
                        </div>

                        <Button type="submit" className="w-full" disabled={submittingTicket}>
                          {submittingTicket ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Submitting...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Send className="h-4 w-4" />
                              Submit Ticket
                            </div>
                          )}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="status">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    System Status
                  </CardTitle>
                  <CardDescription>Current status of TruthLens services</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <h3 className="font-medium text-green-900">All Systems Operational</h3>
                        <p className="text-sm text-green-700">All services are running normally</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Operational</Badge>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">Service Status</h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="font-medium">Fact Checking API</span>
                        </div>
                        <Badge variant="outline" className="text-green-600 border-green-600">Operational</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="font-medium">Bias Analysis</span>
                        </div>
                        <Badge variant="outline" className="text-green-600 border-green-600">Operational</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="font-medium">Media Verification</span>
                        </div>
                        <Badge variant="outline" className="text-green-600 border-green-600">Operational</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="font-medium">Web Dashboard</span>
                        </div>
                        <Badge variant="outline" className="text-green-600 border-green-600">Operational</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="font-medium">Authentication</span>
                        </div>
                        <Badge variant="outline" className="text-green-600 border-green-600">Operational</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">Recent Incidents</h3>
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="h-8 w-8 mx-auto mb-2" />
                      <p>No recent incidents to report</p>
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