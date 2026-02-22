'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Copy, ExternalLink, Play, Code, Book, Zap } from 'lucide-react'
import { toast } from 'sonner'

interface EndpointProps {
  method: string
  path: string
  description: string
  parameters?: Array<{
    name: string
    type: string
    required: boolean
    description: string
  }>
  requestBody?: {
    type: string
    properties: Record<string, any>
  }
  response: {
    type: string
    properties: Record<string, any>
  }
  example: {
    request?: any
    response: any
  }
}

const Endpoint = ({ method, path, description, parameters, requestBody, response, example }: EndpointProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'bg-green-100 text-green-800'
      case 'POST': return 'bg-blue-100 text-blue-800'
      case 'PUT': return 'bg-yellow-100 text-yellow-800'
      case 'DELETE': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  return (
    <Card className="mb-4">
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className={getMethodColor(method)}>{method.toUpperCase()}</Badge>
            <code className="text-sm font-mono">{path}</code>
          </div>
          <Button variant="ghost" size="sm">
            {isExpanded ? '−' : '+'}
          </Button>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          {parameters && parameters.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Parameters</h4>
              <div className="space-y-2">
                {parameters.map((param, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <code className="bg-gray-100 px-2 py-1 rounded">{param.name}</code>
                    <Badge variant="outline">{param.type}</Badge>
                    {param.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                    <span className="text-gray-600">{param.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {requestBody && (
            <div>
              <h4 className="font-semibold mb-2">Request Body</h4>
              <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto">
                <code>{JSON.stringify(requestBody, null, 2)}</code>
              </pre>
            </div>
          )}
          
          <div>
            <h4 className="font-semibold mb-2">Response</h4>
            <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto">
              <code>{JSON.stringify(response, null, 2)}</code>
            </pre>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Example</h4>
            <Tabs defaultValue="response" className="w-full">
              {example.request && (
                <TabsList>
                  <TabsTrigger value="request">Request</TabsTrigger>
                  <TabsTrigger value="response">Response</TabsTrigger>
                </TabsList>
              )}
              
              {example.request && (
                <TabsContent value="request">
                  <div className="relative">
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded text-sm overflow-x-auto">
                      <code>{JSON.stringify(example.request, null, 2)}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(JSON.stringify(example.request, null, 2))}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>
              )}
              
              <TabsContent value="response">
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded text-sm overflow-x-auto">
                    <code>{JSON.stringify(example.response, null, 2)}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(JSON.stringify(example.response, null, 2))}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

const ApiTester = () => {
  const [endpoint, setEndpoint] = useState('/api/fact-check')
  const [method, setMethod] = useState('POST')
  const [headers, setHeaders] = useState('Content-Type: application/json\nAuthorization: Bearer YOUR_API_KEY')
  const [body, setBody] = useState('{\n  "text": "The Earth is flat",\n  "source": "Social media post"\n}')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)

  const testApi = async () => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setResponse(JSON.stringify({
        "id": "fc_123456",
        "status": "completed",
        "result": {
          "verdict": "False",
          "confidence": 0.95,
          "explanation": "Scientific consensus and evidence strongly support that the Earth is spherical.",
          "sources": [
            "NASA Earth Observations",
            "International Space Station imagery",
            "Satellite data"
          ]
        },
        "created_at": "2024-01-15T10:30:00Z"
      }, null, 2))
    } catch (error) {
      setResponse('Error: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          API Tester
        </CardTitle>
        <CardDescription>
          Test API endpoints directly from the documentation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="method">Method</Label>
            <select
              id="method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <div>
            <Label htmlFor="endpoint">Endpoint</Label>
            <Input
              id="endpoint"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="/api/endpoint"
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="headers">Headers</Label>
          <Textarea
            id="headers"
            value={headers}
            onChange={(e) => setHeaders(e.target.value)}
            placeholder="Content-Type: application/json"
            rows={3}
          />
        </div>
        
        <div>
          <Label htmlFor="body">Request Body</Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="{}"
            rows={5}
          />
        </div>
        
        <Button onClick={testApi} disabled={loading} className="w-full">
          {loading ? 'Testing...' : 'Test API'}
        </Button>
        
        {response && (
          <div>
            <Label>Response</Label>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded text-sm overflow-x-auto mt-2">
              <code>{response}</code>
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function ApiDocsPage() {
  const endpoints: EndpointProps[] = [
    {
      method: 'POST',
      path: '/api/fact-check',
      description: 'Analyze text content for factual accuracy',
      requestBody: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text content to fact-check' },
          source: { type: 'string', description: 'Source of the content (optional)' },
          context: { type: 'string', description: 'Additional context (optional)' }
        }
      },
      response: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Unique analysis ID' },
          status: { type: 'string', description: 'Analysis status' },
          result: {
            type: 'object',
            properties: {
              verdict: { type: 'string', description: 'True, False, or Partially True' },
              confidence: { type: 'number', description: 'Confidence score (0-1)' },
              explanation: { type: 'string', description: 'Detailed explanation' },
              sources: { type: 'array', description: 'Supporting sources' }
            }
          }
        }
      },
      example: {
        request: {
          text: "The Earth is flat",
          source: "Social media post"
        },
        response: {
          id: "fc_123456",
          status: "completed",
          result: {
            verdict: "False",
            confidence: 0.95,
            explanation: "Scientific consensus and evidence strongly support that the Earth is spherical.",
            sources: ["NASA Earth Observations", "International Space Station imagery"]
          }
        }
      }
    },
    {
      method: 'POST',
      path: '/api/bias-analysis',
      description: 'Analyze text content for bias and political leaning',
      requestBody: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text content to analyze' },
          source: { type: 'string', description: 'Source of the content (optional)' }
        }
      },
      response: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Unique analysis ID' },
          status: { type: 'string', description: 'Analysis status' },
          result: {
            type: 'object',
            properties: {
              bias_score: { type: 'number', description: 'Bias score (-1 to 1)' },
              political_leaning: { type: 'string', description: 'Left, Center, or Right' },
              confidence: { type: 'number', description: 'Confidence score (0-1)' },
              explanation: { type: 'string', description: 'Detailed analysis' }
            }
          }
        }
      },
      example: {
        request: {
          text: "This politician is clearly the best choice for our country",
          source: "News article"
        },
        response: {
          id: "ba_789012",
          status: "completed",
          result: {
            bias_score: 0.7,
            political_leaning: "Right",
            confidence: 0.82,
            explanation: "The text shows strong positive bias towards a specific politician without presenting balanced viewpoints."
          }
        }
      }
    },
    {
      method: 'POST',
      path: '/api/media-verify',
      description: 'Verify the authenticity of media files (images, videos)',
      requestBody: {
        type: 'object',
        properties: {
          media_url: { type: 'string', description: 'URL of the media file' },
          media_type: { type: 'string', description: 'image or video' },
          context: { type: 'string', description: 'Additional context (optional)' }
        }
      },
      response: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Unique verification ID' },
          status: { type: 'string', description: 'Verification status' },
          result: {
            type: 'object',
            properties: {
              authenticity: { type: 'string', description: 'Authentic, Manipulated, or Uncertain' },
              confidence: { type: 'number', description: 'Confidence score (0-1)' },
              manipulation_detected: { type: 'array', description: 'Types of manipulation found' },
              metadata: { type: 'object', description: 'Media metadata analysis' }
            }
          }
        }
      },
      example: {
        request: {
          media_url: "https://example.com/image.jpg",
          media_type: "image",
          context: "Viral social media image"
        },
        response: {
          id: "mv_345678",
          status: "completed",
          result: {
            authenticity: "Manipulated",
            confidence: 0.88,
            manipulation_detected: ["Digital alteration", "Color enhancement"],
            metadata: {
              creation_date: "2024-01-10",
              camera_model: "Unknown",
              gps_location: null
            }
          }
        }
      }
    },
    {
      method: 'GET',
      path: '/api/notifications',
      description: 'Get user notifications with pagination and filtering',
      parameters: [
        {
          name: 'page',
          type: 'number',
          required: false,
          description: 'Page number (default: 1)'
        },
        {
          name: 'limit',
          type: 'number',
          required: false,
          description: 'Items per page (default: 20)'
        },
        {
          name: 'unread_only',
          type: 'boolean',
          required: false,
          description: 'Filter to unread notifications only'
        }
      ],
      response: {
        type: 'object',
        properties: {
          notifications: { type: 'array', description: 'Array of notification objects' },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'number' },
              limit: { type: 'number' },
              total: { type: 'number' },
              pages: { type: 'number' }
            }
          },
          unread_count: { type: 'number', description: 'Total unread notifications' }
        }
      },
      example: {
        response: {
          notifications: [
            {
              id: "notif_123",
              type: "analysis_complete",
              title: "Fact Check Complete",
              message: "Your fact check analysis is ready",
              read: false,
              created_at: "2024-01-15T10:30:00Z"
            }
          ],
          pagination: { page: 1, limit: 20, total: 5, pages: 1 },
          unread_count: 3
        }
      }
    },
    {
      method: 'PUT',
      path: '/api/notifications',
      description: 'Mark notifications as read',
      requestBody: {
        type: 'object',
        properties: {
          notification_ids: { type: 'array', description: 'Array of notification IDs to mark as read' },
          mark_all: { type: 'boolean', description: 'Mark all notifications as read' }
        }
      },
      response: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          updated_count: { type: 'number', description: 'Number of notifications updated' }
        }
      },
      example: {
        request: { notification_ids: ["notif_123", "notif_456"] },
        response: { success: true, updated_count: 2 }
      }
    },
    {
      method: 'GET',
      path: '/api/profile',
      description: 'Get user profile information',
      response: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
          full_name: { type: 'string' },
          avatar_url: { type: 'string' },
          created_at: { type: 'string' },
          updated_at: { type: 'string' }
        }
      },
      example: {
        response: {
          id: "user_123",
          email: "user@example.com",
          full_name: "John Doe",
          avatar_url: "https://example.com/avatar.jpg",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-15T10:30:00Z"
        }
      }
    },
    {
      method: 'PUT',
      path: '/api/profile',
      description: 'Update user profile information',
      requestBody: {
        type: 'object',
        properties: {
          full_name: { type: 'string', description: 'User full name' },
          avatar_url: { type: 'string', description: 'Avatar image URL' }
        }
      },
      response: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          profile: { type: 'object', description: 'Updated profile data' }
        }
      },
      example: {
        request: { full_name: "Jane Doe" },
        response: {
          success: true,
          profile: {
            id: "user_123",
            full_name: "Jane Doe",
            updated_at: "2024-01-15T10:35:00Z"
          }
        }
      }
    },
    {
      method: 'GET',
      path: '/api/subscription',
      description: 'Get user subscription and usage information',
      response: {
        type: 'object',
        properties: {
          subscription: {
            type: 'object',
            properties: {
              tier: { type: 'string', description: 'free, pro, or enterprise' },
              status: { type: 'string', description: 'active, cancelled, or expired' },
              current_period_end: { type: 'string', description: 'ISO timestamp' }
            }
          },
          usage: {
            type: 'object',
            properties: {
              fact_checks: { type: 'number' },
              bias_analyses: { type: 'number' },
              media_verifications: { type: 'number' }
            }
          },
          limits: {
            type: 'object',
            properties: {
              fact_checks: { type: 'number' },
              bias_analyses: { type: 'number' },
              media_verifications: { type: 'number' }
            }
          }
        }
      },
      example: {
        response: {
          subscription: {
            tier: "pro",
            status: "active",
            current_period_end: "2024-02-15T00:00:00Z"
          },
          usage: { fact_checks: 45, bias_analyses: 23, media_verifications: 12 },
          limits: { fact_checks: 1000, bias_analyses: 1000, media_verifications: 500 }
        }
      }
    },
    {
      method: 'GET',
      path: '/api/history',
      description: 'Get user analysis history with pagination',
      parameters: [
        {
          name: 'page',
          type: 'number',
          required: false,
          description: 'Page number (default: 1)'
        },
        {
          name: 'limit',
          type: 'number',
          required: false,
          description: 'Items per page (default: 20)'
        },
        {
          name: 'type',
          type: 'string',
          required: false,
          description: 'Filter by analysis type'
        }
      ],
      response: {
        type: 'object',
        properties: {
          analyses: { type: 'array', description: 'Array of analysis objects' },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'number' },
              limit: { type: 'number' },
              total: { type: 'number' },
              pages: { type: 'number' }
            }
          }
        }
      },
      example: {
        response: {
          analyses: [
            {
              id: "fc_123456",
              type: "fact_check",
              content: "Sample text",
              result: { verdict: "True", confidence: 0.95 },
              created_at: "2024-01-15T10:30:00Z"
            }
          ],
          pagination: { page: 1, limit: 20, total: 45, pages: 3 }
        }
      }
    },
    {
      method: 'GET',
      path: '/api/analysis/{id}',
      description: 'Retrieve a specific analysis by ID',
      parameters: [
        {
          name: 'id',
          type: 'string',
          required: true,
          description: 'The unique analysis ID'
        }
      ],
      response: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Analysis ID' },
          type: { type: 'string', description: 'fact-check, bias-analysis, or media-verify' },
          status: { type: 'string', description: 'pending, processing, completed, or failed' },
          result: { type: 'object', description: 'Analysis results (if completed)' },
          created_at: { type: 'string', description: 'ISO timestamp' },
          updated_at: { type: 'string', description: 'ISO timestamp' }
        }
      },
      example: {
        response: {
          id: "fc_123456",
          type: "fact-check",
          status: "completed",
          result: {
            verdict: "False",
            confidence: 0.95,
            explanation: "Scientific consensus supports that the Earth is spherical."
          },
          created_at: "2024-01-15T10:30:00Z",
          updated_at: "2024-01-15T10:31:00Z"
        }
      }
    },
    {
      method: 'GET',
      path: '/api/admin/users',
      description: 'Get all users (Admin only)',
      parameters: [
        {
          name: 'page',
          type: 'number',
          required: false,
          description: 'Page number (default: 1)'
        },
        {
          name: 'limit',
          type: 'number',
          required: false,
          description: 'Items per page (default: 20)'
        }
      ],
      response: {
        type: 'object',
        properties: {
          users: { type: 'array', description: 'Array of user objects' },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'number' },
              limit: { type: 'number' },
              total: { type: 'number' },
              pages: { type: 'number' }
            }
          }
        }
      },
      example: {
        response: {
          users: [
            {
              id: "user_123",
              email: "user@example.com",
              full_name: "John Doe",
              subscription_tier: "pro",
              created_at: "2024-01-01T00:00:00Z"
            }
          ],
          pagination: { page: 1, limit: 20, total: 150, pages: 8 }
        }
      }
    },
    {
      method: 'GET',
      path: '/api/admin/metrics',
      description: 'Get platform metrics and analytics (Admin only)',
      response: {
        type: 'object',
        properties: {
          total_users: { type: 'number' },
          total_analyses: { type: 'number' },
          analyses_by_type: {
            type: 'object',
            properties: {
              fact_checks: { type: 'number' },
              bias_analyses: { type: 'number' },
              media_verifications: { type: 'number' }
            }
          },
          subscription_breakdown: {
            type: 'object',
            properties: {
              free: { type: 'number' },
              pro: { type: 'number' },
              enterprise: { type: 'number' }
            }
          },
          recent_activity: { type: 'array', description: 'Recent platform activity' }
        }
      },
      example: {
        response: {
          total_users: 1250,
          total_analyses: 15420,
          analyses_by_type: {
            fact_checks: 8500,
            bias_analyses: 4200,
            media_verifications: 2720
          },
          subscription_breakdown: {
            free: 1000,
            pro: 200,
            enterprise: 50
          },
          recent_activity: [
            {
              type: "user_signup",
              count: 25,
              date: "2024-01-15"
            }
          ]
        }
      }
    }
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">TruthLens API Documentation</h1>
        <p className="text-xl text-gray-600 mb-6">
          Comprehensive API reference for integrating TruthLens fact-checking, bias analysis, and media verification into your applications.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-blue-500" />
                Quick Start
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Get started with our API in minutes
              </p>
              <Button variant="outline" size="sm" className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Guide
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Code className="h-5 w-5 text-green-500" />
                SDKs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Official SDKs for popular languages
              </p>
              <Button variant="outline" size="sm" className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Download
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Book className="h-5 w-5 text-purple-500" />
                Examples
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Code examples and tutorials
              </p>
              <Button variant="outline" size="sm" className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Browse
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="endpoints" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="endpoints">API Endpoints</TabsTrigger>
          <TabsTrigger value="authentication">Authentication</TabsTrigger>
          <TabsTrigger value="rate-limits">Rate Limits</TabsTrigger>
          <TabsTrigger value="testing">API Tester</TabsTrigger>
        </TabsList>
        
        <TabsContent value="endpoints" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">API Endpoints</h2>
            <p className="text-gray-600 mb-6">
              All API endpoints are available at <code className="bg-gray-100 px-2 py-1 rounded">https://api.truthlens.com</code>
            </p>
            
            <div className="space-y-4">
              {endpoints.map((endpoint, index) => (
                <Endpoint key={index} {...endpoint} />
              ))}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="authentication" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">Authentication</h2>
            
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>API Key Authentication</CardTitle>
                <CardDescription>
                  TruthLens uses API keys for authentication. Include your API key in the Authorization header.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Header Format</Label>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded text-sm mt-2">
                      <code>Authorization: Bearer YOUR_API_KEY</code>
                    </pre>
                  </div>
                  
                  <div>
                    <Label>Example Request</Label>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded text-sm mt-2">
                      <code>{`curl -X POST https://api.truthlens.com/api/fact-check \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "Your text to fact-check"}'`}</code>
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Getting Your API Key</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Sign up for a TruthLens account</li>
                  <li>Navigate to your dashboard</li>
                  <li>Go to Settings → API Keys</li>
                  <li>Generate a new API key</li>
                  <li>Copy and securely store your key</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="rate-limits" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">Rate Limits</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Free Tier</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• 100 requests/day</li>
                    <li>• 10 requests/hour</li>
                    <li>• 1 request/minute</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pro Tier</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• 10,000 requests/day</li>
                    <li>• 1,000 requests/hour</li>
                    <li>• 50 requests/minute</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Enterprise</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Custom limits</li>
                    <li>• Dedicated support</li>
                    <li>• SLA guarantees</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Rate Limit Headers</CardTitle>
                <CardDescription>
                  Every API response includes rate limit information in the headers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded text-sm">
                  <code>{`X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642694400
X-RateLimit-Window: 3600`}</code>
                </pre>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="testing">
          <div>
            <h2 className="text-2xl font-bold mb-4">API Tester</h2>
            <p className="text-gray-600 mb-6">
              Test our API endpoints directly from this page. Enter your API key and try different requests.
            </p>
            <ApiTester />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}