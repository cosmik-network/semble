import { NextResponse } from 'next/server';

/**
 * MCP server card served at `semble.so/.well-known/mcp.json`.
 *
 * This is the primary discovery document: MCP clients probe the domain a user
 * mentions ("semble.so") and read this file to find the actual MCP endpoint,
 * which lives on the API origin (`api.semble.so/mcp`). The endpoint is derived
 * from NEXT_PUBLIC_API_BASE_URL so it stays correct across environments.
 */
export function GET() {
  const apiBaseUrl = (
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3000'
  ).replace(/\/$/, '');
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:4000'
  ).replace(/\/$/, '');

  return NextResponse.json({
    name: 'semble',
    description: 'Interact with your Semble cards, collections, and notes.',
    icon: `${appUrl}/semble-icon-512x512.png`,
    endpoint: `${apiBaseUrl}/mcp`,
  });
}
