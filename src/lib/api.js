import { supabase } from './supabase'

async function call(method, path, body) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export const api = {
  getData:        ()                         => call('GET',    '/api/data'),
  addHouse:       (name)                     => call('POST',   '/api/houses',   { name }),
  deleteHouse:    (id)                       => call('DELETE', '/api/houses',   { id }),
  addSection:     (house_id, name)           => call('POST',   '/api/sections', { house_id, name }),
  deleteSection:  (id)                       => call('DELETE', '/api/sections', { id }),
  addPlace:       (section_id, name)         => call('POST',   '/api/places',   { section_id, name }),
  deletePlace:    (id)                       => call('DELETE', '/api/places',   { id }),
  addItem:        (name)                     => call('POST',   '/api/items',    { name }),
  moveItem:       (id, place_id)             => call('PATCH',  '/api/items',    { id, place_id }),
  deleteItem:     (id)                       => call('DELETE', '/api/items',    { id }),
  logActivity:    (type, desc, meta)         => call('POST',   '/api/activity', { type, description: desc, metadata: meta }),
  sendInvite:     (house_id, invited_email)  => call('POST',   '/api/invites',  { house_id, invited_email }),
  respondInvite:  (id, action)               => call('PATCH',  '/api/invites',  { id, action }),
  removeMember:   (house_id, member_user_id) => call('DELETE', '/api/invites',  { house_id, member_user_id }),
}
