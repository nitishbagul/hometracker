import { createClerkClient, verifyToken } from '@clerk/backend'

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

export async function getUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return null
  try {
    const { sub } = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY })
    const user = await clerkClient.users.getUser(sub)
    const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress
    return { id: sub, email }
  } catch {
    return null
  }
}
