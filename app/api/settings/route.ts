import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateSettingsBody, withDatabaseErrorHandling, RequestContext } from '@/lib/api-middleware';

const defaultSettings = {
  notifications: {
    email: true,
    push: true,
    fact_check_alerts: true,
    bias_alerts: true
  },
  privacy: {
    public_profile: false,
    share_analytics: true
  },
  preferences: {
    theme: 'light',
    language: 'en',
    auto_fact_check: true,
    confidence_threshold: 0.7
  }
};

async function getSettings(request: NextRequest, context: RequestContext) {
  const userSettings = await withDatabaseErrorHandling(
    () => context.supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', context.user!.id)
      .single()
      .then((result: any) => {
        if (result.error && result.error.code !== 'PGRST116') {
          throw result.error;
        }
        return result.data;
      }),
    'fetch settings'
  );

  return NextResponse.json({ 
    settings: (userSettings as any)?.settings || defaultSettings 
  });
}

async function updateSettings(request: NextRequest, context: RequestContext) {
  validateSettingsBody(context.body);

  const settings = await withDatabaseErrorHandling(
    () => context.supabase
      .from('user_settings')
      .upsert({
        user_id: context.user!.id,
        settings: context.body.settings,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
      .then((result: any) => {
        if (result.error) throw result.error;
        return result.data;
      }),
    'update settings'
  );

  return NextResponse.json({ settings: (settings as any).settings });
}

async function resetSettings(request: NextRequest, context: RequestContext) {
  const settings = await withDatabaseErrorHandling(
    () => context.supabase
      .from('user_settings')
      .upsert({
        user_id: context.user!.id,
        settings: defaultSettings,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
      .then((result: any) => {
        if (result.error) throw result.error;
        return result.data;
      }),
    'reset settings'
  );

  return NextResponse.json({ settings: (settings as any).settings });
}

export const GET = withAuth(getSettings);
export const PUT = withAuth(updateSettings);
export const DELETE = withAuth(resetSettings);