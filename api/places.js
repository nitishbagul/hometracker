import { getUser } from './_auth.js'
import { getDb } from './_db.js'

export default async function handler(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const sql = getDb()

  if (req.method === 'POST') {
    const { section_id, name } = req.body
    const [owned] = await sql`
      SELECT s.id FROM sections s JOIN houses h ON h.id = s.house_id
      WHERE s.id = ${section_id} AND h.user_id = ${user.id}`
    if (!owned) return res.status(403).json({ error: 'Forbidden' })
    const [place] = await sql`
      INSERT INTO places (section_id, name) VALUES (${section_id}, ${name}) RETURNING *`
    return res.json(place)
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    await sql`
      DELETE FROM places WHERE id = ${id}
      AND section_id IN (
        SELECT s.id FROM sections s JOIN houses h ON h.id = s.house_id WHERE h.user_id = ${user.id}
      )`
    return res.json({ ok: true })
  }

  res.status(405).end()
}
