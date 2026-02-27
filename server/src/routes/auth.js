import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

/** GET /api/auth/session — returns current user id when JWT is valid */
router.get('/session', requireAuth, (req, res) => {
  res.json({ user: { id: req.userId } })
})

export default router
