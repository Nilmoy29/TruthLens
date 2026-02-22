"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Check,
  X,
  Star,
  Zap,
  Shield,
  Users,
  BarChart3,
  Clock,
  Headphones,
  Globe,
  CreditCard,
  ArrowRight,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { supabase } from "@/lib/supabase-client"

interface PricingPlan {
  id: string
  name: string
  description: string
  price: number
  billingPeriod: 'monthly' | 'yearly'
  features: string[]
  limitations: string[]
  popular?: boolean
  enterprise?: boolean
  maxAnalyses: number
  apiCalls: number
  support: string
  responseTime: string
}

interface UserSubscription {
  plan: string
  status: 'active' | 'cancelled' | 'past_due'
  current_period_end: string
  cancel_at_period_end: boolean
}

const pricingPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for trying out TruthLens',
    price: 0,
    billingPeriod: 'monthly',
    maxAnalyses: 10,
    apiCalls: 50,
    support: 'Community',
    responseTime: '48 hours',
    features: [
      '10 fact checks per month',
      '5 bias analyses per month',
      '5 media verifications per month',
      'Basic accuracy scoring',
      'Community support',
      'Standard processing speed'
    ],
    limitations: [
      'Limited to 10 total analyses',
      'No priority support',
      'No advanced features',
      'No API access'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For professionals and content creators',
    price: 29,
    billingPeriod: 'monthly',
    maxAnalyses: 500,
    apiCalls: 2000,
    support: 'Email',
    responseTime: '24 hours',
    popular: true,
    features: [
      '500 analyses per month',
      'Advanced bias detection',
      'Detailed source verification',
      'Export capabilities',
      'Priority processing',
      'Email support',
      'API access (2,000 calls/month)',
      'Custom analysis reports',
      'Historical data access'
    ],
    limitations: [
      'Limited to 500 analyses',
      'Email support only'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For organizations and large teams',
    price: 199,
    billingPeriod: 'monthly',
    maxAnalyses: -1, // Unlimited
    apiCalls: 50000,
    support: 'Phone & Email',
    responseTime: '4 hours',
    enterprise: true,
    features: [
      'Unlimited analyses',
      'Advanced AI models',
      'Custom integrations',
      'Dedicated account manager',
      'Priority support',
      'SLA guarantee',
      'API access (50,000 calls/month)',
      'White-label options',
      'Advanced analytics',
      'Team management',
      'Custom training data',
      'On-premise deployment option'
    ],
    limitations: []
  }
]

const yearlyPlans: PricingPlan[] = pricingPlans.map(plan => ({
  ...plan,
  billingPeriod: 'yearly' as const,
  price: plan.price === 0 ? 0 : Math.floor(plan.price * 12 * 0.8) // 20% discount for yearly
}))

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingPayment, setProcessingPayment] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          // Load user's current subscription
          const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_tier, subscription_status, subscription_end_date')
            .eq('id', user.id)
            .single()

          if (profile) {
            setCurrentSubscription({
              plan: profile.subscription_tier || 'free',
              status: profile.subscription_status || 'active',
              current_period_end: profile.subscription_end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              cancel_at_period_end: false
            })
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [])

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      window.location.href = '/auth/login'
      return
    }

    setProcessingPayment(planId)
    
    try {
      // In a real app, you would integrate with Stripe, PayPal, or another payment processor
      // For demo purposes, we'll simulate the subscription process
      
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate API call
      
      // Update user's subscription in the database
      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_tier: planId,
          subscription_status: 'active',
          subscription_end_date: new Date(Date.now() + (billingPeriod === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', user.id)

      if (!error) {
        setCurrentSubscription({
          plan: planId,
          status: 'active',
          current_period_end: new Date(Date.now() + (billingPeriod === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false
        })
        
        // Show success message
        alert('Subscription updated successfully!')
      }
    } catch (error) {
      console.error('Error processing payment:', error)
      alert('Payment processing failed. Please try again.')
    } finally {
      setProcessingPayment(null)
    }
  }

  const handleCancelSubscription = async () => {
    if (!user || !currentSubscription) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'cancelled'
        })
        .eq('id', user.id)

      if (!error) {
        setCurrentSubscription({
          ...currentSubscription,
          status: 'cancelled',
          cancel_at_period_end: true
        })
        alert('Subscription cancelled successfully. You can continue using your plan until the end of the billing period.')
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      alert('Failed to cancel subscription. Please try again.')
    }
  }

  const currentPlans = billingPeriod === 'yearly' ? yearlyPlans : pricingPlans

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
          <div className="text-center py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Choose Your Plan
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Get access to advanced fact-checking, bias analysis, and media verification tools.
                Start with our free plan or upgrade for more features.
              </p>
              
              {/* Billing Toggle */}
              <div className="flex items-center justify-center mb-8">
                <div className="bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setBillingPeriod('monthly')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      billingPeriod === 'monthly'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingPeriod('yearly')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      billingPeriod === 'yearly'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Yearly
                    <Badge className="ml-2 bg-green-100 text-green-800">Save 20%</Badge>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Current Subscription Status */}
        {currentSubscription && currentSubscription.plan !== 'free' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="font-medium text-blue-900">
                        Current Plan: {currentSubscription.plan.charAt(0).toUpperCase() + currentSubscription.plan.slice(1)}
                      </h3>
                      <p className="text-sm text-blue-700">
                        {currentSubscription.status === 'cancelled' 
                          ? `Cancelled - Access until ${new Date(currentSubscription.current_period_end).toLocaleDateString()}`
                          : `Renews on ${new Date(currentSubscription.current_period_end).toLocaleDateString()}`
                        }
                      </p>
                    </div>
                  </div>
                  {currentSubscription.status === 'active' && (
                    <Button variant="outline" onClick={handleCancelSubscription}>
                      Cancel Subscription
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {currentPlans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`relative ${plan.popular ? 'scale-105' : ''}`}
            >
              <Card className={`h-full ${plan.popular ? 'border-red-500 shadow-lg' : 'border-gray-200'}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-red-500 text-white px-3 py-1">
                      <Star className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <CardDescription className="text-gray-600">{plan.description}</CardDescription>
                  
                  <div className="mt-4">
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold text-gray-900">
                        ${plan.price}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-gray-500 ml-1">
                          /{billingPeriod === 'yearly' ? 'year' : 'month'}
                        </span>
                      )}
                    </div>
                    {billingPeriod === 'yearly' && plan.price > 0 && (
                      <p className="text-sm text-green-600 mt-1">
                        Save ${Math.floor(plan.price * 0.25)} per year
                      </p>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Key Stats */}
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {plan.maxAnalyses === -1 ? '∞' : plan.maxAnalyses}
                      </div>
                      <div className="text-xs text-gray-500">Analyses/month</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {plan.apiCalls.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">API calls/month</div>
                    </div>
                  </div>
                  
                  {/* Features */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Features included:</h4>
                    <ul className="space-y-2">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-600">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Support Info */}
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Headphones className="h-4 w-4" />
                      <span>{plan.support} support</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <Clock className="h-4 w-4" />
                      <span>{plan.responseTime} response time</span>
                    </div>
                  </div>
                  
                  {/* CTA Button */}
                  <div className="pt-4">
                    {currentSubscription?.plan === plan.id ? (
                      <Button className="w-full" disabled>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        className={`w-full ${
                          plan.popular
                            ? 'bg-red-600 hover:bg-red-700'
                            : plan.enterprise
                            ? 'bg-gray-900 hover:bg-gray-800'
                            : ''
                        }`}
                        variant={plan.popular || plan.enterprise ? 'default' : 'outline'}
                        onClick={() => handleSubscribe(plan.id)}
                        disabled={processingPayment === plan.id}
                      >
                        {processingPayment === plan.id ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Processing...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {plan.price === 0 ? 'Get Started' : 'Subscribe Now'}
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16"
        >
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
              <CardDescription>Everything you need to know about our pricing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Can I change my plan anytime?</h3>
                  <p className="text-sm text-gray-600">
                    Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately for upgrades, 
                    or at the end of your billing cycle for downgrades.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">What payment methods do you accept?</h3>
                  <p className="text-sm text-gray-600">
                    We accept all major credit cards (Visa, MasterCard, American Express) and PayPal. 
                    Enterprise customers can also pay by invoice.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Is there a free trial?</h3>
                  <p className="text-sm text-gray-600">
                    Our Free plan gives you access to try TruthLens with limited usage. 
                    Pro and Enterprise plans come with a 14-day money-back guarantee.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Do you offer discounts for nonprofits?</h3>
                  <p className="text-sm text-gray-600">
                    Yes, we offer special pricing for qualified nonprofits, educational institutions, 
                    and journalists. Contact our sales team for more information.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Enterprise CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16"
        >
          <Card className="bg-gradient-to-r from-gray-900 to-gray-800 text-white">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Need a Custom Solution?</h2>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                Our Enterprise plan can be customized to meet your organization's specific needs. 
                Get dedicated support, custom integrations, and volume discounts.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="secondary" className="bg-white text-gray-900 hover:bg-gray-100">
                  <Users className="h-4 w-4 mr-2" />
                  Contact Sales
                </Button>
                <Button variant="outline" className="border-white text-white hover:bg-white hover:text-gray-900">
                  <Globe className="h-4 w-4 mr-2" />
                  Schedule Demo
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}