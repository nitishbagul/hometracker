import { getUser } from './_auth.js'
import { getDb } from './_db.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const sql = getDb()
  const { type, description, metadata = {} } = req.body

  const [act] = await sql`
    INSERT INTO activity (user_id, type, description, metadata)
    VALUES (${user.id}, ${type}, ${description}, ${JSON.stringify(metadata)})
    RETURNING *`

  res.json(act)
}
