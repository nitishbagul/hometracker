import { getUser } from './_auth.js'
import { getDb, canAccessHouse } from './_db.js'

export default async function handler(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const sql = getDb()

  if (req.method === 'POST') {
    const { section_id, name } = req.body
    const [sec] = await sql`SELECT house_id FROM sections WHERE id = ${section_id}`
    if (!sec) return res.status(404).json({ error: 'Section not found' })
    const access = await canAccessHouse(sql, user.id, sec.house_id)
    if (!access) return res.status(403).json({ error: 'Forbidden' })
    const [place] = await sql`
      INSERT INTO places (section_id, name) VALUES (${section_id}, ${name}) RETURNING *`
    return res.json(place)
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    const [place] = await sql`
      SELECT p.id, s.house_id FROM places p
      JOIN sections s ON s.id = p.section_id WHERE p.id = ${id}`
    if (!place) return res.status(404).json({ error: 'Not found' })
    const access = await canAccessHouse(sql, user.id, place.house_id)
    if (!access) return res.status(403).json({ error: 'Forbidden' })
    await sql`DELETE FROM places WHERE id = ${id}`
    return res.json({ ok: true })
  }

  res.status(405).end()
}
