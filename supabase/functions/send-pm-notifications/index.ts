import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webPush from 'https://esm.sh/web-push@3.6.7'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!

webPush.setVapidDetails(
  'mailto:admin@gidworkshop.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // Use East Africa Time (UTC+3)
  const now = new Date()
  const eatOffset = 3 * 60
  const eatTime = new Date(now.getTime() + eatOffset * 60 * 1000)
  const today = new Date(eatTime.toISOString().split('T')[0])
  today.setHours(0, 0, 0, 0)

  const in7Days = new Date(today)
  in7Days.setDate(today.getDate() + 7)

  const in21Days = new Date(today)
  in21Days.setDate(today.getDate() + 21)

  const todayStr = today.toISOString().split('T')[0]
  const in7Str = in7Days.toISOString().split('T')[0]
  const in21Str = in21Days.toISOString().split('T')[0]

  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, name, location, next_pm_date, facility_id')

  if (!equipment) return new Response('No equipment found', { status: 200 })

  const notifications = []

  for (const item of equipment) {
    if (!item.next_pm_date) continue

    const pmDate = item.next_pm_date.split('T')[0]
    let title = null
    let body = null

    if (pmDate === todayStr) {
      title = `PM due today — ${item.name}`
      body = `${item.location} · Tap to view checklist and mark done`
    } else if (pmDate === in7Str) {
      title = `PM due in 7 days — ${item.name}`
      body = `${item.location} · Schedule time to complete it`
    } else if (pmDate === in21Str) {
      title = `PM due in 3 weeks — ${item.name}`
      body = `${item.location} · Good time to check spare parts`
    } else if (pmDate < todayStr) {
      title = `Overdue PM — ${item.name}`
      body = `${item.location} · Please complete or reschedule`
    }

    if (!title) continue

    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('facility_id', item.facility_id)

    if (!tokens) continue

    for (const { token } of tokens) {
      notifications.push({ token, title, body, equipmentId: item.id })
    }
  }

  let sent = 0
  let failed = 0

  for (const notif of notifications) {
    try {
      const subscription = JSON.parse(notif.token)
      await webPush.sendNotification(
        subscription,
        JSON.stringify({
          title: notif.title,
          body: notif.body,
          url: `/equipment/${notif.equipmentId}`
        })
      )
      sent++
    } catch (err) {
      console.error('Failed to send notification:', err)
      failed++
    }
  }

  return new Response(
    JSON.stringify({ sent, failed, total: notifications.length }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})