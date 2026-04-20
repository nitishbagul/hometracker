import { getUser } from './_auth.js'
import { getDb, isHouseOwner } from './_db.js'

export default async function handler(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const sql = getDb()

  // GET — fetch pending invites for the current user's email
  if (req.method === 'GET') {
    const invites = await sql`
      SELECT * FROM house_invites
      WHERE invited_email = ${user.email} AND status = 'pending'
      ORDER BY created_at DESC`
    return res.json(invites)
  }

  // POST — owner sends an invite
  if (req.method === 'POST') {
    const { house_id, invited_email } = req.body
    if (!invited_email) return res.status(400).json({ error: 'Email required' })

    const owned = await isHouseOwner(sql, user.id, house_id)
    if (!owned) return res.status(403).json({ error: 'Only the house owner can invite members' })

    if (invited_email.toLowerCase() === user.email.toLowerCase())
      return res.status(400).json({ error: "You can't invite yourself" })

    const [house] = await sql`SELECT name FROM houses WHERE id = ${house_id}`

    // Upsert — if they were previously declined, re-invite them
    const [invite] = await sql`
      INSERT INTO house_invites (house_id, invited_email, invited_by, house_name, inviter_email)
      VALUES (${house_id}, ${invited_email.toLowerCase()}, ${user.id}, ${house.name}, ${user.email})
      ON CONFLICT (house_id, invited_email)
      DO UPDATE SET status = 'pending', created_at = now()
      RETURNING *`

    return res.json(invite)
  }

  // PATCH — accept or decline
  if (req.method === 'PATCH') {
    const { id, action } = req.body
    if (!['accepted', 'declined'].includes(action))
      return res.status(400).json({ error: 'action must be accepted or declined' })

    const [invite] = await sql`
      SELECT * FROM house_invites
      WHERE id = ${id} AND invited_email = ${user.email} AND status = 'pending'`

    if (!invite) return res.status(404).json({ error: 'Invite not found' })

    await sql`UPDATE house_invites SET status = ${action} WHERE id = ${id}`

    if (action === 'accepted') {
      await sql`
        INSERT INTO house_members (house_id, user_id, role)
        VALUES (${invite.house_id}, ${user.id}, 'member')
        ON CONFLICT (house_id, user_id) DO NOTHING`
    }

    return res.json({ ok: true, action, house_id: invite.house_id })
  }

  // DELETE — owner removes a member
  if (req.method === 'DELETE') {
    const { house_id, member_user_id } = req.body
    const owned = await isHouseOwner(sql, user.id, house_id)
    if (!owned) return res.status(403).json({ error: 'Only the owner can remove members' })
    await sql`DELETE FROM house_members WHERE house_id = ${house_id} AND user_id = ${member_user_id}`
    return res.json({ ok: true })
  }

  res.status(405).end()
}
