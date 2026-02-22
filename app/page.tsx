"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LoadingState } from "@/components/loading-state"
import { Navigation } from "@/components/navigation"
import {
  Shield,
  Eye,
  Camera,
  AlertTriangle,
  CheckCircle,
  XCircle,
  History,
  BookOpen,
  ExternalLink,
  Trash2,
  Download,
  Share2,
  Lightbulb,
  Menu,
  X,
} from "lucide-react"
import { supabase } from "../lib/supabase-client"
import type { User } from "@supabase/supabase-js"

interface FactCheckResult {
  credibilityScore: number
  analysis: string
  sources: string[]
  flags: string[]
  confidence: number
  methodology: string[]
  timestamp: number
  id: string
  error?: string
}

interface BiasAnalysisResult {
  politicalBias: string
  biasConfidence: number
  emotionalTone: string
  analysis: string
  biasIndicators: string[]
  timestamp: number
  id: string
  error?: string
}

interface MediaVerificationResult {
  authenticity: {
    score: number
    analysis: string
  }
  fileInfo: {
    name: string
    type: string
    size: number
  }
  technicalAnalysis: {
    resolution: string
    metadata: {
      hasOriginalMetadata: boolean
      gpsLocation: string
      cameraModel: string
      timestamp: string
    }
  }
  deepfakeAnalysis?: {
    faceConsistency: number
    lipSyncAccuracy: number
    eyeMovementNatural: number
    overallLikelihood: number
  }
  manipulationFlags: string[]
  recommendations: string[]
  error?: string
}

interface HistoryItem {
  id: string
  type: "fact-check" | "bias-analysis" | "media-verify"
  content: string
  result: any
  timestamp: number
}

function getScoreIcon(score: number) {
  if (score >= 80) return <CheckCircle className="h-6 w-6 text-green-600" />
  if (score >= 60) return <AlertTriangle className="h-6 w-6 text-yellow-600" />
  return <XCircle className="h-6 w-6 text-red-600" />
}

function getScoreLabel(score: number) {
  if (score >= 80) return "Highly Credible"
  if (score >= 60) return "Moderately Credible"
  if (score >= 40) return "Low Credibility"
  return "Not Credible"
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-green-600"
  if (score >= 60) return "text-yellow-600"
  return "text-red-600"
}

function getAuthenticityIcon(score: number) {
  if (score >= 80) return <CheckCircle className="h-6 w-6 text-green-600" />
  if (score >= 60) return <AlertTriangle className="h-6 w-6 text-yellow-600" />
  return <XCircle className="h-6 w-6 text-red-600" />
}

function getAuthenticityColor(score: number) {
  if (score >= 80) return "text-green-600"
  if (score >= 60) return "text-yellow-600"
  return "text-red-600"
}

export default function TruthLensApp() {
  const [activeTab, setActiveTab] = useState("check-news")
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const initSupabase = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        fetchHistory(user.id)
      } else {
        // Fallback to localStorage if no user
        const savedHistory = localStorage.getItem("truthlens-history")
        if (savedHistory) {
          setHistory(JSON.parse(savedHistory))
        }
      }
    }
    initSupabase()
  }, [])

  const fetchHistory = async (userId: string) => {
    try {
      const { data: factChecks } = await supabase.from('fact_checks').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
      const { data: biasAnalyses } = await supabase.from('bias_analyses').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
      const { data: mediaVerifications } = await supabase.from('media_verifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)

      const combined = [
        ...(factChecks || []).map(fc => ({
          id: fc.id,
          type: "fact-check" as const,
          content: fc.content ? fc.content.substring(0, 100) + (fc.content.length > 100 ? "..." : "") : "",
          result: fc,
          timestamp: new Date(fc.created_at).getTime()
        })),
        ...(biasAnalyses || []).map(ba => ({
          id: ba.id,
          type: "bias-analysis" as const,
          content: ba.content ? ba.content.substring(0, 100) + (ba.content.length > 100 ? "..." : "") : "",
          result: ba,
          timestamp: new Date(ba.created_at).getTime()
        })),
        ...(mediaVerifications || []).map(mv => ({
          id: mv.id,
          type: "media-verify" as const,
          content: mv.content || mv.fileInfo?.name || "",
          result: mv,
          timestamp: new Date(mv.created_at).getTime()
        }))
      ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50)

      setHistory(combined)
    } catch (error) {
      console.error('Error fetching history:', error)
    }
  }

  const handleFactCheck = async (input: string) => {
    setIsLoading(true)
    setResults(null)
    try {
      const response = await fetch("/api/fact-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input }),
      })
      const data = await response.json()

      if (!response.ok) {
        let errorMsg = data.error || "Failed to analyze content";
        if (response.status === 401) errorMsg = "Authentication required. Please log in.";
        else if (response.status === 429) errorMsg = "Rate limit exceeded. Please try again later.";
        else if (response.status >= 500) errorMsg = "Server error. Please try again.";
        setResults({ error: errorMsg });
        return
      }

      setResults(data)
      if (user) {
        setHistory(prev => [
          { id: data.id, type: "fact-check" as const, content: input.substring(0, 100) + (input.length > 100 ? "..." : ""), result: { ...data, timestamp: Date.now(), id: data.id }, timestamp: Date.now() },
          ...prev
        ].slice(0, 50))
      } else {
        // Fallback to local save
        const historyItem = { id: Date.now().toString(), type: "fact-check" as const, content: input.substring(0, 100) + (input.length > 100 ? "..." : ""), result: { ...data, timestamp: Date.now(), id: Date.now().toString() }, timestamp: Date.now() }
        const newHistory = [historyItem, ...history].slice(0, 50)
        setHistory(newHistory)
        localStorage.setItem("truthlens-history", JSON.stringify(newHistory))
      }
    } catch (error) {
      console.error("Fact check error:", error);
      setResults({ error: error instanceof Error ? `Network error: ${error.message}` : "Unknown network error occurred" });
    } finally {
      setIsLoading(false);
    }
  }

  const handleBiasAnalysis = async (input: string) => {
    setIsLoading(true)
    setResults(null)
    try {
      const response = await fetch("/api/bias-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input }),
      })
      const data = await response.json()

      if (!response.ok) {
        setResults({ error: data.error || "Failed to analyze content" })
        return
      }

      setResults(data)
      if (user) {
        setHistory(prev => [
          { id: data.id, type: "bias-analysis" as const, content: input.substring(0, 100) + (input.length > 100 ? "..." : ""), result: { ...data, timestamp: Date.now(), id: data.id }, timestamp: Date.now() },
          ...prev
        ].slice(0, 50))
      } else {
        const historyItem = { id: Date.now().toString(), type: "bias-analysis" as const, content: input.substring(0, 100) + (input.length > 100 ? "..." : ""), result: { ...data, timestamp: Date.now(), id: Date.now().toString() }, timestamp: Date.now() }
        const newHistory = [historyItem, ...history].slice(0, 50)
        setHistory(newHistory)
        localStorage.setItem("truthlens-history", JSON.stringify(newHistory))
      }
    } catch (error) {
      console.error("Bias analysis error:", error)
      setResults({ error: "Network error. Please try again." })
    } finally {
      setIsLoading(false)
    }
  }

  const handleMediaVerification = async (file: File) => {
    setIsLoading(true)
    setResults(null)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/media-verify", {
        method: "POST",
        body: formData,
      })
      const data = await response.json()

      if (!response.ok) {
        setResults({ error: data.error || "Failed to verify media" })
        return
      }

      setResults(data)
      if (user) {
        setHistory(prev => [
          { id: data.id, type: "media-verify" as const, content: file.name, result: { ...data, timestamp: Date.now(), id: data.id }, timestamp: Date.now() },
          ...prev
        ].slice(0, 50))
      } else {
        const historyItem = { id: Date.now().toString(), type: "media-verify" as const, content: file.name, result: { ...data, timestamp: Date.now(), id: Date.now().toString() }, timestamp: Date.now() }
        const newHistory = [historyItem, ...history].slice(0, 50)
        setHistory(newHistory)
        localStorage.setItem("truthlens-history", JSON.stringify(newHistory))
      }
    } catch (error) {
      console.error("Media verification error:", error)
      setResults({ error: "Network error. Please try again." })
    } finally {
      setIsLoading(false)
    }
  }

  const clearHistory = async () => {
    if (user) {
      await supabase.from('fact_checks').delete().eq('user_id', user.id)
      await supabase.from('bias_analyses').delete().eq('user_id', user.id)
      await supabase.from('media_verifications').delete().eq('user_id', user.id)
      setHistory([])
    } else {
      setHistory([])
      localStorage.removeItem("truthlens-history")
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation user={user} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden mb-6 bg-gray-50 rounded-lg p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className="text-xs">
                  <History className="h-3 w-3 mr-1" />
                  {history.length} analyses
                </Badge>
                <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)} className="text-xs">
                  History
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8"
            >
              <Card className="shadow-sm border-gray-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-serif text-gray-900 flex items-center gap-2">
                        <History className="h-5 w-5 text-red-600" />
                        Analysis History
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-600">
                        Your recent fact-checks and analyses
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearHistory}
                      className="text-xs border-gray-300 hover:border-red-600 hover:text-red-600 bg-transparent"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {history.length === 0 ? (
                    <p className="text-gray-600 text-center py-8 text-sm">
                      No analyses yet. Start by checking some content!
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {history.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {item.type === "fact-check" ? (
                                <Shield className="h-3 w-3 text-red-600" />
                              ) : item.type === "bias-analysis" ? (
                                <Eye className="h-3 w-3 text-gray-700" />
                              ) : (
                                <Camera className="h-3 w-3 text-gray-700" />
                              )}
                              <Badge variant="outline" className="text-xs border-gray-300">
                                {item.type === "fact-check"
                                  ? "Fact Check"
                                  : item.type === "bias-analysis"
                                    ? "Bias Analysis"
                                    : "Media Verify"}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {new Date(item.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 truncate">{item.content}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setResults(item.result)
                              setActiveTab(
                                item.type === "fact-check"
                                  ? "check-news"
                                  : item.type === "bias-analysis"
                                    ? "analyze-bias"
                                    : "verify-media",
                              )
                            }}
                            className="text-xs hover:text-red-600"
                          >
                            View
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-lg h-12">
            <TabsTrigger
              value="check-news"
              className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm transition-all"
            >
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Fact Check</span>
            </TabsTrigger>
            <TabsTrigger
              value="analyze-bias"
              className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm transition-all"
            >
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Bias Analysis</span>
            </TabsTrigger>
            <TabsTrigger
              value="verify-media"
              className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm transition-all"
            >
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Media Verify</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="check-news">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="shadow-sm border-gray-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <Shield className="h-5 w-5 text-red-600" />
                    Fact Checker
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600">
                    AI-powered credibility analysis with source verification
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FactCheckForm onSubmit={handleFactCheck} isLoading={isLoading} />
                  <AnimatePresence>
                    {isLoading && <LoadingState message="Analyzing credibility and checking sources..." />}
                    {results && activeTab === "check-news" && !isLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        <EnhancedFactCheckResults results={results} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="analyze-bias">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="shadow-sm border-gray-200">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl text-gray-900 flex items-center gap-2 font-sans font-bold">
                    <Eye className="h-5 w-5 text-red-600" />
                    Bias Analysis
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600">
                    Multi-dimensional bias detection and political leaning analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <BiasAnalysisForm onSubmit={handleBiasAnalysis} isLoading={isLoading} />
                  <AnimatePresence>
                    {isLoading && <LoadingState message="Analyzing bias and political leaning..." />}
                    {results && activeTab === "analyze-bias" && !isLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        <BiasAnalysisResults results={results} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="verify-media">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="shadow-sm border-gray-200">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-serif text-gray-900 flex items-center gap-2">
                    <Camera className="h-5 w-5 text-red-600" />
                    Media Authentication
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600">
                    Advanced deepfake detection and image manipulation analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <EnhancedMediaVerificationForm onSubmit={handleMediaVerification} isLoading={isLoading} />
                  <AnimatePresence>
                    {isLoading && <LoadingState message="Analyzing media authenticity..." />}
                    {results && activeTab === "verify-media" && !isLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        <MediaVerificationResults results={results} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-12"
        >
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-gray-900 flex items-center gap-2 font-sans">
                <BookOpen className="h-5 w-5 text-red-600" />
                Media Literacy Guide
              </CardTitle>
              <CardDescription className="text-sm text-gray-600">
                Essential skills for navigating today's information landscape
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <motion.div className="space-y-3" whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-red-600" />
                    <h4 className="font-serif font-semibold text-gray-900 text-sm">Spotting Misinformation</h4>
                  </div>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Verify source credibility and expertise</li>
                    <li>• Check publication date and context</li>
                    <li>• Look for supporting evidence</li>
                    <li>• Cross-reference multiple sources</li>
                    <li>• Be wary of emotional language</li>
                  </ul>
                </motion.div>

                <motion.div className="space-y-3" whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-red-600" />
                    <h4 className="font-serif font-semibold text-gray-900 text-sm">Identifying Bias</h4>
                  </div>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Notice loaded or emotional language</li>
                    <li>• Check for multiple perspectives</li>
                    <li>• Consider source's political leaning</li>
                    <li>• Look for cherry-picked statistics</li>
                    <li>• Examine omitted information</li>
                  </ul>
                </motion.div>

                <motion.div className="space-y-3" whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-red-600" />
                    <h4 className="font-serif font-semibold text-gray-900 text-sm">Digital Verification</h4>
                  </div>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Reverse image search for photos</li>
                    <li>• Check video metadata and timestamps</li>
                    <li>• Look for digital manipulation signs</li>
                    <li>• Verify social media authenticity</li>
                    <li>• Use fact-checking websites</li>
                  </ul>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

function FactCheckForm({ onSubmit, isLoading }: { onSubmit: (input: string) => void; isLoading: boolean }) {
  const [input, setInput] = useState("")
  const [inputType, setInputType] = useState<"text" | "url">("text")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      onSubmit(input.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={inputType === "text" ? "default" : "outline"}
            size="sm"
            onClick={() => setInputType("text")}
            className={
              inputType === "text"
                ? "bg-red-600 hover:bg-red-700"
                : "border-gray-300 hover:border-red-600 hover:text-red-600"
            }
          >
            Text Content
          </Button>
          <Button
            type="button"
            variant={inputType === "url" ? "default" : "outline"}
            size="sm"
            onClick={() => setInputType("url")}
            className={
              inputType === "url"
                ? "bg-red-600 hover:bg-red-700"
                : "border-gray-300 hover:border-red-600 hover:text-red-600"
            }
          >
            Article URL
          </Button>
        </div>

        {inputType === "url" ? (
          <Input
            placeholder="https://example.com/news-article"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="text-sm border-gray-300 focus:border-red-600 focus:ring-red-600"
          />
        ) : (
          <Textarea
            placeholder="Paste news article text, social media post, or claim to fact-check..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-[100px] text-sm border-gray-300 focus:border-red-600 focus:ring-red-600 resize-none"
          />
        )}
      </div>

      <Button
        type="submit"
        disabled={!input.trim() || isLoading}
        className="w-full h-10 text-sm font-medium bg-red-600 hover:bg-red-700 disabled:bg-gray-300"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
            Analyzing...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Check Credibility
          </div>
        )}
      </Button>
    </form>
  )
}

function EnhancedFactCheckResults({ results }: { results: FactCheckResult | { error: string } }) {
  if ('error' in results) {
    return (
      <Alert className="border-l-4 border-l-red-600 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-sm text-red-800">{results.error}</AlertDescription>
      </Alert>
    )
  }

  const shareResults = () => {
    const text = `TruthLens Analysis: ${getScoreLabel(results.credibilityScore)} (${results.credibilityScore}%)\n${results.analysis}`
    navigator.share?.({ text }) || navigator.clipboard.writeText(text)
  }

  return (
    <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Main Score Display */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {getScoreIcon(results.credibilityScore)}
            <div>
              <h3 className="text-lg font-serif font-bold text-gray-900">{getScoreLabel(results.credibilityScore)}</h3>
              <p className="text-xs text-gray-600">Credibility Assessment</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${getScoreColor(results.credibilityScore)}`}>
              {results.credibilityScore}%
            </div>
            <div className="text-xs text-gray-600">Confidence</div>
          </div>
        </div>

        <Progress value={results.credibilityScore} className="h-2 mb-2" />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Low Credibility</span>
          <span>High Credibility</span>
        </div>
      </div>

      {/* Analysis */}
      <Alert className="border-l-4 border-l-gray-400 bg-gray-50">
        <AlertTriangle className="h-4 w-4 text-gray-600" />
        <AlertDescription className="text-sm leading-relaxed text-gray-800">{results.analysis}</AlertDescription>
      </Alert>

      {/* Sources and Flags */}
      <div className="grid md:grid-cols-2 gap-4">
        {results.sources && results.sources.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-serif font-semibold text-sm flex items-center gap-2 text-gray-900">
              <ExternalLink className="h-3 w-3" />
              Supporting Sources
            </h4>
            <div className="space-y-1">
              {results.sources.map((source: string, index: number) => (
                <Badge key={index} variant="outline" className="mr-2 mb-1 text-xs border-gray-300">
                  {source}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {results.flags && results.flags.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-serif font-semibold text-sm flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-3 w-3" />
              Red Flags
            </h4>
            <div className="space-y-1">
              {results.flags.map((flag: string, index: number) => (
                <Badge key={index} className="mr-2 mb-1 text-xs bg-red-600 hover:bg-red-700">
                  {flag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-3 border-t border-gray-200">
        <Button
          variant="outline"
          size="sm"
          onClick={shareResults}
          className="text-xs border-gray-300 hover:border-red-600 hover:text-red-600 bg-transparent"
        >
          <Share2 className="h-3 w-3 mr-1" />
          Share
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs border-gray-300 hover:border-red-600 hover:text-red-600 bg-transparent"
        >
          <Download className="h-3 w-3 mr-1" />
          Export
        </Button>
      </div>
    </motion.div>
  )
}

function BiasAnalysisForm({ onSubmit, isLoading }: { onSubmit: (input: string) => void; isLoading: boolean }) {
  const [input, setInput] = useState("")
  const [inputType, setInputType] = useState<"text" | "url">("text")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      onSubmit(input.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={inputType === "text" ? "default" : "outline"}
            size="sm"
            onClick={() => setInputType("text")}
            className={
              inputType === "text"
                ? "bg-red-600 hover:bg-red-700"
                : "border-gray-300 hover:border-red-600 hover:text-red-600"
            }
          >
            Text Content
          </Button>
          <Button
            type="button"
            variant={inputType === "url" ? "default" : "outline"}
            size="sm"
            onClick={() => setInputType("url")}
            className={
              inputType === "url"
                ? "bg-red-600 hover:bg-red-700"
                : "border-gray-300 hover:border-red-600 hover:text-red-600"
            }
          >
            Article URL
          </Button>
        </div>

        {inputType === "url" ? (
          <Input
            placeholder="https://example.com/news-article"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="text-sm border-gray-300 focus:border-red-600 focus:ring-red-600"
          />
        ) : (
          <Textarea
            placeholder="Paste news article, headline, or opinion piece to analyze for political bias..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-[100px] text-sm border-gray-300 focus:border-red-600 focus:ring-red-600 resize-none"
          />
        )}
      </div>

      <Button
        type="submit"
        disabled={!input.trim() || isLoading}
        className="w-full h-10 text-sm font-medium bg-red-600 hover:bg-red-700 disabled:bg-gray-300"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
            Analyzing...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Analyze Bias
          </div>
        )}
      </Button>
    </form>
  )
}

function BiasAnalysisResults({ results }: { results: BiasAnalysisResult | { error: string } }) {
  if ('error' in results) {
    return (
      <Alert className="border-l-4 border-l-red-600 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-sm text-red-800">{results.error}</AlertDescription>
      </Alert>
    )
  }

  const shareResults = () => {
    const text = `TruthLens Bias Analysis: ${results.politicalBias} (${results.biasConfidence}%)\n${results.analysis}`
    navigator.share?.({ text }) || navigator.clipboard.writeText(text)
  }

  return (
    <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Main Bias Score Display */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {results.biasConfidence >= 80 ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            )}
            <div>
              <h3 className="text-lg font-serif font-bold text-gray-900">{results.politicalBias}</h3>
              <p className="text-xs text-gray-600">Political Bias Assessment</p>
            </div>
          </div>
          <div className="text-right">
            <div
              className={`text-2xl font-bold ${results.biasConfidence >= 80 ? "text-green-600" : "text-yellow-600"}`}
            >
              {results.biasConfidence}%
            </div>
            <div className="text-xs text-gray-600">Confidence</div>
          </div>
        </div>

        <Progress value={results.biasConfidence} className="h-2 mb-2" />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Low Confidence</span>
          <span>High Confidence</span>
        </div>
      </div>

      {/* Analysis */}
      <Alert className="border-l-4 border-l-gray-400 bg-gray-50">
        <Eye className="h-4 w-4 text-gray-600" />
        <AlertDescription className="text-sm leading-relaxed text-gray-800">{results.analysis}</AlertDescription>
      </Alert>

      {/* Emotional Tone and Bias Indicators */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-2 text-gray-900 font-sans">
            <Eye className="h-3 w-3 text-red-600" />
            Emotional Tone
          </h4>
          <p className="text-sm text-gray-700">{results.emotionalTone}</p>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-2 text-red-600 font-sans">
            <AlertTriangle className="h-3 w-3" />
            Bias Indicators
          </h4>
          <div className="flex flex-wrap gap-1">
            {results.biasIndicators && results.biasIndicators.length > 0 ? (
              results.biasIndicators.map((indicator: string, index: number) => (
                <Badge key={index} className="mr-2 mb-1 text-xs bg-red-600 hover:bg-red-700">
                  {indicator}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-gray-600">No specific bias indicators detected</p>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-3 border-t border-gray-200">
        <Button
          variant="outline"
          size="sm"
          onClick={shareResults}
          className="text-xs border-gray-300 hover:border-red-600 hover:text-red-600 bg-transparent"
        >
          <Share2 className="h-3 w-3 mr-1" />
          Share
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs border-gray-300 hover:border-red-600 hover:text-red-600 bg-transparent"
        >
          <Download className="h-3 w-3 mr-1" />
          Export
        </Button>
      </div>
    </motion.div>
  )
}

function EnhancedMediaVerificationForm({
  onSubmit,
  isLoading,
}: { onSubmit: (file: File) => void; isLoading: boolean }) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      setSelectedFile(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      setSelectedFile(files[0])
    }
  }

  const handleSubmit = () => {
    if (selectedFile) {
      onSubmit(selectedFile)
    }
  }

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
          dragActive ? "border-red-400 bg-red-50" : "border-gray-300 hover:border-gray-400"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Camera className="h-12 w-12 mx-auto mb-3 text-gray-400" />
        <h3 className="text-base font-serif font-semibold mb-2 text-gray-900">Upload Media for Analysis</h3>
        <p className="text-sm text-gray-600 mb-3">Drag and drop an image or video file here, or click to browse</p>
        <Input
          type="file"
          accept="image/*,video/*"
          className="max-w-xs mx-auto mb-3 text-sm border-gray-300"
          onChange={handleFileSelect}
        />
        <div className="text-xs text-gray-500">Supported: JPG, PNG, GIF, MP4, MOV (Max 50MB)</div>

        {selectedFile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-3 bg-gray-100 rounded-lg"
          >
            <p className="text-sm font-medium text-gray-900">Selected: {selectedFile.name}</p>
            <p className="text-xs text-gray-600">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type}
            </p>
          </motion.div>
        )}
      </div>

      {selectedFile && (
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full h-10 text-sm font-medium bg-red-600 hover:bg-red-700 disabled:bg-gray-300"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              Analyzing...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Verify Authenticity
            </div>
          )}
        </Button>
      )}

      {/* Feature Preview */}
      <div className="grid md:grid-cols-2 gap-3">
        <motion.div className="p-3 bg-gray-50 rounded-lg border border-gray-200" whileHover={{ y: -1 }}>
          <h4 className="font-serif font-semibold text-sm mb-2 flex items-center gap-2 text-gray-900">
            <Camera className="h-3 w-3 text-red-600" />
            Deepfake Detection
          </h4>
          <p className="text-xs text-gray-600">Advanced AI analysis to detect artificially generated content</p>
        </motion.div>

        <motion.div className="p-3 bg-gray-50 rounded-lg border border-gray-200" whileHover={{ y: -1 }}>
          <h4 className="font-serif font-semibold text-sm mb-2 flex items-center gap-2 text-gray-900">
            <Eye className="h-3 w-3 text-red-600" />
            Image Forensics
          </h4>
          <p className="text-xs text-gray-600">Metadata analysis and pixel-level examination</p>
        </motion.div>
      </div>
    </div>
  )
}

function MediaVerificationResults({ results }: { results: MediaVerificationResult | { error: string } }) {
  if ("error" in results) {
    return (
      <Alert className="border-l-4 border-l-red-600 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-sm text-red-800">Error: {results.error}</AlertDescription>
      </Alert>
    )
  }

  if (!results.authenticity || typeof results.authenticity.score !== "number") {
    return (
      <Alert className="border-l-4 border-l-yellow-600 bg-yellow-50">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-sm text-yellow-800">Invalid analysis results received.</AlertDescription>
      </Alert>
    )
  }

  return (
    <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Main Authenticity Score */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {getAuthenticityIcon(results.authenticity.score)}
            <div>
              <h3 className="text-lg font-serif font-bold text-gray-900">
                {results.authenticity.score >= 80
                  ? "Likely Authentic"
                  : results.authenticity.score >= 60
                    ? "Questionable"
                    : "Likely Manipulated"}
              </h3>
              <p className="text-xs text-gray-600">Media Authenticity Assessment</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${getAuthenticityColor(results.authenticity.score)}`}>
              {results.authenticity.score}%
            </div>
            <div className="text-xs text-gray-600">Authenticity</div>
          </div>
        </div>

        <Progress value={results.authenticity.score} className="h-2 mb-2" />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Likely Fake</span>
          <span>Likely Authentic</span>
        </div>
      </div>

      {/* Analysis */}
      <Alert className="border-l-4 border-l-gray-400 bg-gray-50">
        <Camera className="h-4 w-4 text-gray-600" />
        <AlertDescription className="text-sm leading-relaxed text-gray-800">
          {results.authenticity?.analysis || "No analysis available"}
        </AlertDescription>
      </Alert>

      {/* File Information */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-serif font-semibold text-sm mb-3 text-gray-900">File Information</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span className="font-medium text-gray-900">{results.fileInfo?.name || "Unknown"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <span className="font-medium text-gray-900">{results.fileInfo?.type || "Unknown"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Size:</span>
              <span className="font-medium text-gray-900">
                {results.fileInfo?.size ? (results.fileInfo.size / 1024 / 1024).toFixed(2) + " MB" : "Unknown"}
              </span>
            </div>
          </div>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-serif font-semibold text-sm mb-3 text-gray-900">Metadata Analysis</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Original Metadata:</span>
              <Badge
                variant={results.technicalAnalysis?.metadata?.hasOriginalMetadata ? "default" : "destructive"}
                className="text-xs"
              >
                {results.technicalAnalysis?.metadata?.hasOriginalMetadata ? "Present" : "Missing"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Camera Model:</span>
              <span className="font-medium text-gray-900">
                {results.technicalAnalysis?.metadata?.cameraModel || "Unknown"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-3 border-t border-gray-200">
        <Button
          variant="outline"
          size="sm"
          className="text-xs border-gray-300 hover:border-red-600 hover:text-red-600 bg-transparent"
        >
          <Share2 className="h-3 w-3 mr-1" />
          Share
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs border-gray-300 hover:border-red-600 hover:text-red-600 bg-transparent"
        >
          <Download className="h-3 w-3 mr-1" />
          Export
        </Button>
      </div>
    </motion.div>
  )
}
