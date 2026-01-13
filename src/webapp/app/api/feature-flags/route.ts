import { getServerFeatureFlags } from '@/lib/serverFeatureFlags';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const featureFlags = await getServerFeatureFlags();
    return NextResponse.json(featureFlags);
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    // Return default flags if there's an error
    return NextResponse.json({
      similarCards: false,
      cardSearch: false,
    });
  }
}
