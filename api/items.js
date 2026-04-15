import { getUser } from './_auth.js'
import { getDb } from './_db.js'

export default async function handler(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const sql = getDb()

  if (req.method === 'POST') {
    const { name } = req.body
    if (!name) return res.status(400).json({ error: 'Name required' })
    const [item] = await sql`
      INSERT INTO items (user_id, name) VALUES (${user.id}, ${name}) RETURNING *`
    return res.json(item)
  }

  if (req.method === 'PATCH') {
    const { id, place_id } = req.body
    const [item] = await sql`
      UPDATE items SET place_id = ${place_id ?? null}
      WHERE id = ${id} AND user_id = ${user.id} RETURNING *`
    return res.json(item)
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    await sql`DELETE FROM items WHERE id = ${id} AND user_id = ${user.id}`
    return res.json({ ok: true })
  }

  res.status(405).end()
}
