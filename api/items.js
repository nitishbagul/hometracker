import { getUser } from './_auth.js'
import { getDb, canAccessHouse } from './_db.js'

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
    const [item] = await sql`SELECT * FROM items WHERE id = ${id}`
    if (!item) return res.status(404).json({ error: 'Not found' })

    // Owner of item can always move it
    // Members of the target house can also move items into their house
    const isOwner = item.user_id === user.id
    if (!isOwner && place_id) {
      const [place] = await sql`
        SELECT s.house_id FROM places p JOIN sections s ON s.id = p.section_id WHERE p.id = ${place_id}`
      if (!place) return res.status(404).json({ error: 'Place not found' })
      const access = await canAccessHouse(sql, user.id, place.house_id)
      if (!access) return res.status(403).json({ error: 'Forbidden' })
    } else if (!isOwner) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const [updated] = await sql`
      UPDATE items SET place_id = ${place_id ?? null} WHERE id = ${id} RETURNING *`
    return res.json(updated)
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    const [item] = await sql`SELECT user_id FROM items WHERE id = ${id}`
    if (!item) return res.status(404).json({ error: 'Not found' })
    if (item.user_id !== user.id) return res.status(403).json({ error: 'Only the item owner can delete it' })
    await sql`DELETE FROM items WHERE id = ${id}`
    return res.json({ ok: true })
  }

  res.status(405).end()
}
