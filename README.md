# 🎶 FWD Vocoder - Discord Bot

A **high‑quality Discord vocoder bot** built with **Node.js** and **discord.js v14**.  
The bot applies classic vocoder processing by combining a **modulator** (voice/speech) and a **carrier** (synth/noise), producing a clean, musical vocoded output directly in Discord.

This project is designed for **offline, high‑fidelity audio processing**, not real‑time voice chat, ensuring stable and repeatable results.

---

## ✨ Features

- 🎛️ **Slash command interface** (`/vocode`)
- 🎶 High‑quality **offline vocoder engine**
- 📎 Accepts **two audio attachments** (modulator + carrier)
- 🎚️ Adjustable **bandwidth / width control**
- 🧵 **Queue system** to handle multiple requests safely
- 🧹 Automatic **temporary file cleanup**
- 🔊 WAV output with compression, makeup gain & soft limiting
- 🔒 Secure environment variable handling (`.env` not committed)

---

## 🗂 Project Structure

```
.
├─ events/                  # Discord event handlers
│  └─ interactionCreate.js
├─ vocoder/                 # Vocoder DSP engine
│  └─ vocoderEngine.js
├─ temp/                    # Temporary audio files (ignored by git)
├─ deploy-commands.js       # Slash command registration script
├─ index.js                 # Bot entry point
├─ package.json
├─ package-lock.json
├─ .env                     # Environment variables (NOT committed)
└─ .env.example             # Example environment config
```

---

## 🚀 Commands

### `/vocode`
Applies a vocoder using a modulator and carrier audio file.

**Options:**
| Option | Type | Description |
|------|------|-------------|
| `modulator` | Attachment | Voice or speech input |
| `carrier` | Attachment | Synth / noise carrier |
| `width` | Integer (0–100) | Bandwidth control (default: 50) |

**Width behavior:**
- `0` → Thin, robotic, narrow bands
- `50` → Balanced
- `100` → Wide, breathy, noisy

---

## ⚙️ Requirements

- Node.js **18+** (Node 20 recommended)
- Discord bot token
- Discord application ID

---

## 🔐 Environment Variables

Create a `.env` file locally (never commit it):

```env
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_application_id
```

An example file is provided as `.env.example`.

---

## 📡 Register Slash Commands

Run once (or whenever commands change):

```bash
node deploy-commands.js
```

Commands are registered **globally** and may take a few minutes to appear.

---

## ▶️ Running the Bot

```bash
node index.js
```

You should see:
```
Bot online as FWD Vocoder
Slash commands registered.
```

---

## 🎛 Vocoder Engine Overview

- Uses **OfflineAudioContext** via `node-web-audio-api`
- 16‑band logarithmic filter bank (80Hz–7kHz)
- Envelope follower per band
- Dynamic range compression
- Makeup gain (+12dB approx.)
- Soft clipping limiter
- Output encoded as **48kHz WAV**

The engine automatically trims output to the **shorter input length**.

---

## 🧠 Queue System

To avoid CPU overload:
- Only **one vocoder job** runs at a time
- Requests are queued and processed sequentially
- Prevents crashes on free or low‑resource hosts

---

## ⭐ Credits

- discord.js
- node-web-audio-api
- audio-decode
- wav-encoder

---

If you found this project useful, consider giving it a ⭐ on GitHub!

