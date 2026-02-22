import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withDatabaseErrorHandling, RequestContext } from '@/lib/api-middleware';
import { AppError, ErrorType, Logger } from '@/lib/error-handler';

async function getSubscription(request: NextRequest, context: RequestContext) {
  Logger.info('Get subscription request', {
    userId: context.session?.user?.id,
    requestId: context.requestId
  });

  const supabase = context.supabase;

  // Get user subscription
  const subscription = await withDatabaseErrorHandling(async () => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', context.session!.user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error;
    }

    return data;
  }, 'fetch subscription');

  // Return default free subscription if none exists
  const subscriptionData = subscription || {
    user_id: context.session!.user.id,
    tier: 'free',
    status: 'active',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
    stripe_customer_id: null,
    stripe_subscription_id: null
  };

  // Get usage statistics for the current period
  const periodStart = new Date(subscriptionData.current_period_start);
  const periodEnd = new Date(subscriptionData.current_period_end);

  const usage = await withDatabaseErrorHandling(async () => {
    const [factChecks, biasAnalyses, mediaVerifications] = await Promise.all([
      supabase
        .from('fact_checks')
        .select('id', { count: 'exact' })
        .eq('user_id', context.session!.user.id)
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString()),
      supabase
        .from('bias_analyses')
        .select('id', { count: 'exact' })
        .eq('user_id', context.session!.user.id)
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString()),
      supabase
        .from('media_verifications')
        .select('id', { count: 'exact' })
        .eq('user_id', context.session!.user.id)
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString())
    ]);

    return {
      factChecks: factChecks.count || 0,
      biasAnalyses: biasAnalyses.count || 0,
      mediaVerifications: mediaVerifications.count || 0,
      total: (factChecks.count || 0) + (biasAnalyses.count || 0) + (mediaVerifications.count || 0)
    };
  }, 'fetch usage statistics');

  // Define tier limits
  const tierLimits = {
    free: {
      factChecks: 10,
      biasAnalyses: 10,
      mediaVerifications: 5,
      total: 25
    },
    pro: {
      factChecks: 500,
      biasAnalyses: 500,
      mediaVerifications: 200,
      total: 1200
    },
    enterprise: {
      factChecks: -1, // unlimited
      biasAnalyses: -1,
      mediaVerifications: -1,
      total: -1
    }
  };

  const currentLimits = tierLimits[subscriptionData.tier as keyof typeof tierLimits] || tierLimits.free;

  Logger.info('Subscription data retrieved', {
    userId: context.session?.user?.id,
    requestId: context.requestId,
    tier: subscriptionData.tier,
    usage: usage.total
  });

  return NextResponse.json({
    subscription: subscriptionData,
    usage,
    limits: currentLimits,
    remainingUsage: {
      factChecks: currentLimits.factChecks === -1 ? -1 : Math.max(0, currentLimits.factChecks - usage.factChecks),
      biasAnalyses: currentLimits.biasAnalyses === -1 ? -1 : Math.max(0, currentLimits.biasAnalyses - usage.biasAnalyses),
      mediaVerifications: currentLimits.mediaVerifications === -1 ? -1 : Math.max(0, currentLimits.mediaVerifications - usage.mediaVerifications),
      total: currentLimits.total === -1 ? -1 : Math.max(0, currentLimits.total - usage.total)
    }
  });
}

async function createSubscription(request: NextRequest, context: RequestContext) {
  const body = await request.json();
  const { tier, payment_method_id } = body;

  Logger.info('Create subscription request', {
    userId: context.session?.user?.id,
    requestId: context.requestId,
    tier
  });

  if (!tier || !['pro', 'enterprise'].includes(tier)) {
    throw new AppError('Invalid subscription tier', ErrorType.VALIDATION, 400);
  }

  if (!payment_method_id) {
    throw new AppError('Payment method is required', ErrorType.VALIDATION, 400);
  }

  const supabase = context.supabase;

  // Check if user already has a subscription
  const existingSubscription = await withDatabaseErrorHandling(async () => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', context.session!.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }, 'check existing subscription');

  if (existingSubscription && existingSubscription.status === 'active') {
    throw new AppError('User already has an active subscription', ErrorType.VALIDATION, 400);
  }

  // Create Stripe subscription (simplified - in real implementation, use Stripe API)
  const stripeCustomerId = `cus_${Date.now()}`;
  const stripeSubscriptionId = `sub_${Date.now()}`;

  const subscriptionData = {
    user_id: context.session!.user.id,
    tier,
    status: 'active',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const subscription = await withDatabaseErrorHandling(async () => {
    const { data, error } = await supabase
      .from('subscriptions')
      .upsert(subscriptionData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }, 'create subscription');

  Logger.info('Subscription created successfully', {
    userId: context.session?.user?.id,
    requestId: context.requestId,
    tier,
    subscriptionId: subscription.id
  });

  return NextResponse.json({ subscription });
}

async function updateSubscription(request: NextRequest, context: RequestContext) {
  const body = await request.json();
  const { action, tier } = body;

  Logger.info('Update subscription request', {
    userId: context.session?.user?.id,
    requestId: context.requestId,
    action,
    tier
  });

  if (!action || !['upgrade', 'downgrade', 'cancel'].includes(action)) {
    throw new AppError('Invalid action', ErrorType.VALIDATION, 400);
  }

  const supabase = context.supabase;

  // Get current subscription
  const currentSubscription = await withDatabaseErrorHandling(async () => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', context.session!.user.id)
      .single();

    if (error) {
      throw error;
    }

    return data;
  }, 'fetch current subscription');

  if (!currentSubscription) {
    throw new AppError('No subscription found', ErrorType.NOT_FOUND, 404);
  }

  let updateData: any = {
    updated_at: new Date().toISOString()
  };

  switch (action) {
    case 'upgrade':
    case 'downgrade':
      if (!tier || !['free', 'pro', 'enterprise'].includes(tier)) {
        throw new AppError('Invalid tier for upgrade/downgrade', ErrorType.VALIDATION, 400);
      }
      updateData.tier = tier;
      break;
    case 'cancel':
      updateData.status = 'cancelled';
      updateData.cancelled_at = new Date().toISOString();
      break;
  }

  const updatedSubscription = await withDatabaseErrorHandling(async () => {
    const { data, error } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', currentSubscription.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }, 'update subscription');

  Logger.info('Subscription updated successfully', {
    userId: context.session?.user?.id,
    requestId: context.requestId,
    action,
    subscriptionId: updatedSubscription.id
  });

  return NextResponse.json({ subscription: updatedSubscription });
}

export const GET = withAuth(getSubscription);
export const POST = withAuth(createSubscription);
export const PUT = withAuth(updateSubscription);