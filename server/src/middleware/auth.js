import jwt from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '')
const LEGACY_JWT_SECRET = process.env.SUPABASE_JWT_SECRET

/** JWKS client for Supabase ECC/RSA signing keys (cached) */
const jwksClientInstance = SUPABASE_URL
  ? jwksClient({
      jwksUri: `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
      cache: true,
      cacheMaxAge: 600000, // 10 min
    })
  : null

function getSigningKey(header, callback) {
  if (!jwksClientInstance) return callback(new Error('JWKS not configured'))
  jwksClientInstance.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err)
    const pubKey = key?.getPublicKey?.()
    if (!pubKey) return callback(new Error('No public key'))
    callback(null, pubKey)
  })
}

/**
 * Middleware that verifies the Supabase JWT from Authorization: Bearer <token>
 * and sets req.userId to the user's UUID (JWT sub claim).
 * Tries JWKS first (ECC/RS256), then legacy HS256 secret if configured.
 * Responds with 401 if missing or invalid.
 */
export function requireAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization' })
  }

  const token = auth.slice(7)

  function onVerified(err, decoded) {
    if (err) return res.status(401).json({ error: 'Invalid or expired token' })
    req.userId = decoded.sub
    next()
  }

  // 1) Try JWKS (Supabase ECC P-256 / RS256 signing keys)
  if (jwksClientInstance) {
    jwt.verify(
      token,
      getSigningKey,
      { algorithms: ['ES256', 'RS256'] },
      (err, decoded) => {
        if (!err) return onVerified(null, decoded)
        // 2) Fallback to legacy HS256 secret if JWKS verification failed
        if (LEGACY_JWT_SECRET) {
          jwt.verify(token, LEGACY_JWT_SECRET, { algorithms: ['HS256'] }, (err2, decoded2) => {
            onVerified(err2, decoded2)
          })
        } else {
          onVerified(err, null)
        }
      }
    )
    return
  }

  // 3) Only legacy secret configured
  if (LEGACY_JWT_SECRET) {
    jwt.verify(token, LEGACY_JWT_SECRET, { algorithms: ['HS256'] }, onVerified)
    return
  }

  return res.status(503).json({ error: 'Server auth not configured (set SUPABASE_URL or SUPABASE_JWT_SECRET)' })
}
