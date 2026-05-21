import { NextRequest, NextResponse } from 'next/server';
import { paths } from '@semble/types';

const ENABLE_AUTH_LOGGING = true;

export async function POST(request: NextRequest) {
  try {
    // Proxy to backend to handle token revocation and cookie deletion
    const backendUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3000';
    const backendResponse = await fetch(`${backendUrl}${paths.logout}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: request.headers.get('cookie') || '',
      },
    });

    if (backendResponse.ok) {
      // Backend succeeded - forward the response with its Set-Cookie headers
      const responseData = await backendResponse.json();
      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': backendResponse.headers.get('set-cookie') || '',
        },
      });
    } else {
      // Backend failed - fallback to clearing cookies in Next.js
      console.warn(
        'Backend logout failed, clearing cookies in Next.js as fallback',
      );
      if (ENABLE_AUTH_LOGGING) {
        console.log(
          '[auth/logout] Clearing cookies as fallback after backend failure',
        );
      }

      const response = NextResponse.json({
        success: true,
        message: 'Logged out successfully (fallback)',
      });

      // Clear cookies as fallback
      response.cookies.delete('accessToken');
      response.cookies.delete('refreshToken');

      return response;
    }
  } catch (error) {
    console.error('Logout error:', error);

    // Network error - fallback to clearing cookies in Next.js
    if (ENABLE_AUTH_LOGGING) {
      console.log(
        '[auth/logout] Clearing cookies as fallback after network error',
      );
    }
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully (fallback)',
    });

    response.cookies.delete('accessToken');
    response.cookies.delete('refreshToken');

    return response;
  }
}
