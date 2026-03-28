import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // we'll add this shortly
)

const BOT_TOKEN = process.env.VITE_TELEGRAM_BOT_TOKEN
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID  // your personal Telegram chat ID

// In-memory state per user (works fine for serverless short sessions)
const sessions = {}

async function sendMessage(chatId, text, extra = {}) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...extra })
  })
}

async function sendPhoto(chatId, photoUrl, caption) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption, parse_mode: 'HTML' })
  })
}

async function getFileUrl(fileId) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`)
  const data = await res.json()
  return `https://api.telegram.org/file/bot${BOT_TOKEN}/${data.result.file_path}`
}

async function downloadAndUploadImage(fileId, userId) {
  const telegramUrl = await getFileUrl(fileId)
  const imageRes = await fetch(telegramUrl)
  const buffer = await imageRes.arrayBuffer()
  const filename = `telegram-${userId}-${Date.now()}.jpg`
  const { error } = await supabase.storage
    .from('pothole-images')
    .upload(filename, buffer, { contentType: 'image/jpeg' })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage
    .from('pothole-images')
    .getPublicUrl(filename)
  return publicUrl
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true })

  const update = req.body
  const msg = update.message
  if (!msg) return res.status(200).json({ ok: true })

  const chatId = msg.chat.id
  const userId = String(msg.from.id)
  const userName = msg.from.first_name || 'Anonymous'

  if (!sessions[userId]) sessions[userId] = { step: 'idle' }
  const session = sessions[userId]

  // /start command
  if (msg.text === '/start') {
    sessions[userId] = { step: 'idle' }
    await sendMessage(chatId,
      `👋 Welcome to <b>PotholeReporter</b>, ${userName}!\n\n` +
      `Help us map road damage in Thane.\n\n` +
      `Send /report to file a new incident.`
    )
    return res.status(200).json({ ok: true })
  }

  // /report command
  if (msg.text === '/report') {
    sessions[userId] = { step: 'waiting_photo' }
    await sendMessage(chatId,
      `📷 <b>Step 1 of 3 — Photo</b>\n\nSend a clear photo of the pothole.`
    )
    return res.status(200).json({ ok: true })
  }

  // Waiting for photo
  if (session.step === 'waiting_photo') {
    if (!msg.photo) {
      await sendMessage(chatId, `⚠️ Please send a <b>photo</b> of the pothole.`)
      return res.status(200).json({ ok: true })
    }
    const fileId = msg.photo[msg.photo.length - 1].file_id
    session.fileId = fileId
    session.step = 'waiting_location'
    await sendMessage(chatId,
      `✅ Photo received!\n\n📍 <b>Step 2 of 3 — Location</b>\n\nTap the 📎 attachment button → Location → Send your current location.`
    )
    return res.status(200).json({ ok: true })
  }

  // Waiting for location
  if (session.step === 'waiting_location') {
    if (!msg.location) {
      await sendMessage(chatId, `⚠️ Please share your <b>location</b> using the attachment button.`)
      return res.status(200).json({ ok: true })
    }
    session.lat = msg.location.latitude
    session.lng = msg.location.longitude
    session.step = 'waiting_description'
    await sendMessage(chatId,
      `✅ Location locked!\n\n💬 <b>Step 3 of 3 — Description</b>\n\nBriefly describe the damage, or send /skip to skip.`
    )
    return res.status(200).json({ ok: true })
  }

  // Waiting for description
  if (session.step === 'waiting_description') {
    const description = msg.text === '/skip' ? '' : (msg.text || '')
    session.step = 'submitting'

    try {
      await sendMessage(chatId, `⏳ Uploading and saving your report...`)

      const imageUrl = await downloadAndUploadImage(session.fileId, userId)

      const { data: report, error } = await supabase.from('reports').insert({
        image_url: imageUrl,
        lat: session.lat,
        lng: session.lng,
        description,
        source: 'telegram',
        reporter_id: userId,
        reporter_name: userName,
        city: 'thane'
      }).select().single()

      if (error) throw error

      sessions[userId] = { step: 'idle' }

      await sendMessage(chatId,
        `🎉 <b>Report submitted!</b>\n\n` +
        `Your report is pending review and will appear on the map once approved.\n\n` +
        `📍 ${session.lat.toFixed(5)}, ${session.lng.toFixed(5)}\n` +
        `Send /report to file another incident.`
      )

      // Alert admin
      if (ADMIN_CHAT_ID) {
        await sendPhoto(ADMIN_CHAT_ID, imageUrl,
          `🚨 <b>New Report — Review Required</b>\n\n` +
          `👤 Reporter: ${userName} (Telegram)\n` +
          `📍 ${session.lat.toFixed(5)}, ${session.lng.toFixed(5)}\n` +
          `💬 ${description || 'No description'}\n\n` +
          `🔗 Approve in dashboard`
        )
      }

    } catch (err) {
      sessions[userId] = { step: 'idle' }
      await sendMessage(chatId, `❌ Something went wrong. Please try again with /report`)
      console.error(err)
    }

    return res.status(200).json({ ok: true })
  }

  // Fallback
  await sendMessage(chatId, `Send /start to begin or /report to file an incident.`)
  return res.status(200).json({ ok: true })
}