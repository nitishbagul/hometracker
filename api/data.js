import { getUser } from './_auth.js'
import { getDb } from './_db.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const sql = getDb()

  const [houses, sections, places, items, acts] = await Promise.all([
    sql`SELECT * FROM houses WHERE user_id = ${user.id} ORDER BY created_at`,
    sql`SELECT s.* FROM sections s JOIN houses h ON h.id = s.house_id WHERE h.user_id = ${user.id} ORDER BY s.created_at`,
    sql`SELECT p.* FROM places p JOIN sections s ON s.id = p.section_id JOIN houses h ON h.id = s.house_id WHERE h.user_id = ${user.id} ORDER BY p.created_at`,
    sql`SELECT * FROM items WHERE user_id = ${user.id} ORDER BY created_at`,
    sql`SELECT * FROM activity WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 300`,
  ])

  res.json({ houses, sections, places, items, acts })
}
