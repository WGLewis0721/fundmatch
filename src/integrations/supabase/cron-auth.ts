export async function authenticateCronRequest(
  request: Request,
): Promise<Response | null> {
  // Vercel Cron automatically sends CRON_SECRET as a Bearer token. Keep the
  // FundMatch name as a compatibility fallback for non-Vercel/manual drains.
  const currentSecret =
    process.env['CRON_SECRET'] ?? process.env['FUNDMATCH_CRON_SECRET']
  const previousSecret = process.env['FUNDMATCH_CRON_SECRET_PREVIOUS']

  if (!currentSecret) {
    return new Response('Server configuration error', { status: 500 })
  }

  const match = /^Bearer ([^\s,]+)$/.exec(
    request.headers.get('authorization') ?? '',
  )
  const token = match?.[1]
  if (!token) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { createHash, timingSafeEqual } = await import('node:crypto')
  const digest = (value: string) =>
    createHash('sha256').update(value, 'utf8').digest()
  const providedDigest = digest(token)
  const currentMatches = timingSafeEqual(providedDigest, digest(currentSecret))
  const previousMatches = timingSafeEqual(
    providedDigest,
    digest(previousSecret ?? currentSecret),
  )

  if (!currentMatches && !previousMatches) {
    return new Response('Unauthorized', { status: 401 })
  }

  return null
}
