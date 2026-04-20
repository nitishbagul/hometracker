import { neon } from '@neondatabase/serverless'

export function getDb() {
  return neon(process.env.NEON_DATABASE_URL)
}

// Returns true if user owns or is a member of the house
export async function canAccessHouse(sql, userId, houseId) {
  const rows = await sql`
    SELECT 1 FROM houses h
    LEFT JOIN house_members hm ON hm.house_id = h.id
    WHERE h.id = ${houseId}
      AND (h.user_id = ${userId} OR hm.user_id = ${userId})
    LIMIT 1`
  return rows.length > 0
}

// Returns true only if user is the original owner
export async function isHouseOwner(sql, userId, houseId) {
  const rows = await sql`
    SELECT 1 FROM houses WHERE id = ${houseId} AND user_id = ${userId} LIMIT 1`
  return rows.length > 0
}
