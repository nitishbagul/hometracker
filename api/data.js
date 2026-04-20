import { getUser } from './_auth.js'
import { getDb } from './_db.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const sql = getDb()
  const uid = user.id

  const [houses, sections, places, items, acts, invites, members] = await Promise.all([
    // Houses user owns OR is a member of
    sql`
      SELECT DISTINCT h.* FROM houses h
      LEFT JOIN house_members hm ON hm.house_id = h.id
      WHERE h.user_id = ${uid} OR hm.user_id = ${uid}
      ORDER BY h.created_at`,

    // Sections from accessible houses
    sql`
      SELECT DISTINCT s.* FROM sections s
      JOIN houses h ON h.id = s.house_id
      LEFT JOIN house_members hm ON hm.house_id = h.id
      WHERE h.user_id = ${uid} OR hm.user_id = ${uid}
      ORDER BY s.created_at`,

    // Places from accessible houses
    sql`
      SELECT DISTINCT p.* FROM places p
      JOIN sections s ON s.id = p.section_id
      JOIN houses h ON h.id = s.house_id
      LEFT JOIN house_members hm ON hm.house_id = h.id
      WHERE h.user_id = ${uid} OR hm.user_id = ${uid}
      ORDER BY p.created_at`,

    // Own items + items placed in accessible houses
    sql`
      SELECT DISTINCT i.* FROM items i
      LEFT JOIN places p ON p.id = i.place_id
      LEFT JOIN sections s ON s.id = p.section_id
      LEFT JOIN houses h ON h.id = s.house_id
      LEFT JOIN house_members hm ON hm.house_id = h.id
      WHERE i.user_id = ${uid}
         OR (i.place_id IS NOT NULL AND (h.user_id = ${uid} OR hm.user_id = ${uid}))
      ORDER BY i.created_at`,

    // Activity
    sql`
      SELECT * FROM activity WHERE user_id = ${uid}
      ORDER BY created_at DESC LIMIT 300`,

    // Pending invites for this user's email
    sql`
      SELECT * FROM house_invites
      WHERE invited_email = ${user.email} AND status = 'pending'
      ORDER BY created_at DESC`,

    // Members of all accessible houses (for displaying member lists)
    sql`
      SELECT hm.*, h.user_id as owner_id FROM house_members hm
      JOIN houses h ON h.id = hm.house_id
      LEFT JOIN house_members hm2 ON hm2.house_id = h.id
      WHERE h.user_id = ${uid} OR hm2.user_id = ${uid}`,
  ])

  res.json({ houses, sections, places, items, acts, invites, members })
}
