/**
 * Health check endpoint for monitoring and uptime checks.
 * Returns service status and basic runtime info.
 */
export async function GET() {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'development',
  })
}
