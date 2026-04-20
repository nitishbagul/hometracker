import { getUser } from './_auth.js'
import { getDb, isHouseOwner } from './_db.js'

export default async function handler(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const sql = getDb()

  if (req.method === 'POST') {
    const { name } = req.body
    if (!name) return res.status(400).json({ error: 'Name required' })
    const [house] = await sql`
      INSERT INTO houses (user_id, name) VALUES (${user.id}, ${name}) RETURNING *`
    return res.json(house)
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    const owned = await isHouseOwner(sql, user.id, id)
    if (!owned) return res.status(403).json({ error: 'Only the owner can delete a house' })
    await sql`DELETE FROM houses WHERE id = ${id}`
    return res.json({ ok: true })
  }

  res.status(405).end()
}
