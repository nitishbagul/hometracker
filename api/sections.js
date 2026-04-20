import { getUser } from './_auth.js'
import { getDb, canAccessHouse } from './_db.js'

export default async function handler(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const sql = getDb()

  if (req.method === 'POST') {
    const { house_id, name } = req.body
    const access = await canAccessHouse(sql, user.id, house_id)
    if (!access) return res.status(403).json({ error: 'Forbidden' })
    const [section] = await sql`
      INSERT INTO sections (house_id, name) VALUES (${house_id}, ${name}) RETURNING *`
    return res.json(section)
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    const [sec] = await sql`SELECT house_id FROM sections WHERE id = ${id}`
    if (!sec) return res.status(404).json({ error: 'Not found' })
    const access = await canAccessHouse(sql, user.id, sec.house_id)
    if (!access) return res.status(403).json({ error: 'Forbidden' })
    await sql`DELETE FROM sections WHERE id = ${id}`
    return res.json({ ok: true })
  }

  res.status(405).end()
}
