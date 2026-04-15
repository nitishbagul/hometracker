import { getUser } from './_auth.js'
import { getDb } from './_db.js'

export default async function handler(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const sql = getDb()

  if (req.method === 'POST') {
    const { house_id, name } = req.body
    const [owned] = await sql`SELECT id FROM houses WHERE id = ${house_id} AND user_id = ${user.id}`
    if (!owned) return res.status(403).json({ error: 'Forbidden' })
    const [section] = await sql`
      INSERT INTO sections (house_id, name) VALUES (${house_id}, ${name}) RETURNING *`
    return res.json(section)
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    await sql`
      DELETE FROM sections WHERE id = ${id}
      AND house_id IN (SELECT id FROM houses WHERE user_id = ${user.id})`
    return res.json({ ok: true })
  }

  res.status(405).end()
}
