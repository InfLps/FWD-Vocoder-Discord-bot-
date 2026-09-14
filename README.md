# 🤖 FWD Vocoder Discord Bot

<div align="center">

![GitHub stars](https://img.shields.io/github/stars/InfLps/FWD-Vocoder-Discord-bot-?style=for-the-badge&logo=github&logoColor=white)
![GitHub forks](https://img.shields.io/github/forks/InfLps/FWD-Vocoder-Discord-bot-?style=for-the-badge&logo=github&logoColor=white)
![GitHub issues](https://img.shields.io/github/issues/InfLps/FWD-Vocoder-Discord-bot-?style=for-the-badge&logo=github&logoColor=white)
[![GitHub license](https://img.shields.io/github/license/InfLps/FWD-Vocoder-Discord-bot-?style=for-the-badge&color=blue)](LICENSE)

**Professional Vocoder Discord Bot - Transform Audio Files with Real-Time Effects**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-14-7289DA?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org/)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-required-007808?style=for-the-badge&logo=ffmpeg&logoColor=white)](https://ffmpeg.org/)

</div>

---

## 🎵 Overview

**FWD Vocoder Discord Bot** is a professional audio‑processing Discord bot that applies **16‑band vocoder effects** to audio and video files.

It combines a **modulator** (voice) and a **carrier** (synth or noise) to create robotic, futuristic vocal effects. The bot supports a wide range of audio and video formats and delivers production‑ready output.

---

## ✨ Features

- 🎛️ **16‑Band Professional Vocoder**\
  Logarithmically spaced frequency bands (80 Hz – 7 kHz)

- 📁 **Audio & Video Support**\
  MP3, WAV, M4A, OGG, FLAC, MP4, MOV, MKV, AVI, WEBM

- 🎚️ **Bandwidth (Width) Control**\
  From narrow robotic tones to wide natural vocals

- ⚡ **Smart Processing Queue**\
  Sequential processing to avoid server overload

- 🔧 **Post‑Processing Chain**\
  Compression, makeup gain, and soft clipping

- 🔄 **Automatic Cleanup**\
  Temporary file management with orphan cleanup

- 🤖 **Modern Slash Commands**\
  Easy‑to‑use `/vocode` command

---

## 🛠️ Tech Stack
- Core Runtime

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Discord.js](https://img.shields.io/badge/Discord.js-7289DA?style=for-the-badge&logo=discord&logoColor=white)

- Audio Processing

![FFmpeg](https://img.shields.io/badge/FFmpeg-007808?style=for-the-badge&logo=ffmpeg&logoColor=white)
![Node Web Audio API](https://img.shields.io/badge/Node_Web_Audio_API-FF6B6B?style=for-the-badge&logo=node.js&logoColor=white)
![audio-decode](https://img.shields.io/badge/audio--decode-4A90E2?style=for-the-badge&logo=waves&logoColor=white)
![wav-encoder](https://img.shields.io/badge/wav--encoder-8E44AD?style=for-the-badge&logo=waveform&logoColor=white)

- Utilities

![UUID](https://img.shields.io/badge/UUID-FFA500?style=for-the-badge&logo=uuid&logoColor=white)
![dotenv](https://img.shields.io/badge/dotenv-ECD53F?style=for-the-badge&logo=dotenv&logoColor=black)
![node-fetch](https://img.shields.io/badge/node--fetch-026E00?style=for-the-badge&logo=hyper&logoColor=white)
---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** (LTS recommended)
- **FFmpeg** installed globally
- **Discord Bot Token** from the Discord Developer Portal

### Install FFmpeg

- **Windows:** Download from ffmpeg.org
- **macOS:** `brew install ffmpeg`
- **Linux:** `sudo apt install ffmpeg`

---

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/InfLps/FWD-Vocoder-Discord-bot-.git
   cd FWD-Vocoder-Discord-bot-/FWD_Vocoder
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your bot token:

   ```env
   DISCORD_TOKEN=your_bot_token_here
   ```

4. **Start the bot**

   ```bash
   npm start
   ```

---

## Project Structure

```text
FWD-Vocoder-Discord-bot-/
├── FWD_Vocoder/
│   ├── index.js                 # Main bot entry
│   ├── vocoder/
│   │   └── vocoderEngine.js     # 16-band vocoder engine
│   ├── events/
│   │   └── interactionCreate.js # Slash command handler
│   ├── package.json
│   ├── .env.example
│   └── temp/                    # Auto-created temp files
├── LICENSE
└── README.md
```

---

## Bot Commands

### `/vocode`

Apply a 16‑band vocoder effect to two audio or video files.

**Options**

| Name      | Required | Description                            |
| --------- | -------- | -------------------------------------- |
| modulator | ✅ Yes    | Voice audio/video file                 |
| carrier   | ✅ Yes    | Synth or noise audio/video file        |
| width     | ❌ No     | Bandwidth control (0–100, default: 50) |

**Example**

```text
/vocode modulator:voice.mp3 carrier:synth.wav width:75
```

### Width Guide

- **0–30%** → Narrow, robotic, metallic
- **30–70%** → Balanced vocoder sound
- **70–100%** → Wide, natural, full spectrum

---

## ⚙️ Configuration

### Environment Variables

| Variable       | Description       | Required |
| -------------- | ----------------- | -------- |
| DISCORD\_TOKEN | Discord bot token | ✅ Yes    |

### Required Bot Permissions

- View Channels
- Send Messages
- Attach Files

---

##  Technical Details

### Vocoder Engine

- 16 logarithmically spaced frequency bands
- Real‑time envelope following
- Width‑controlled Q‑factor
- Compressor + makeup gain + soft clipper

### Processing Pipeline

1. File download & validation
2. FFmpeg conversion to 48 kHz WAV
3. 16‑band vocoder processing
4. Post‑processing
5. WAV encoding & delivery

---

## Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. Commit your changes
   ```bash
   git commit -m "Add AmazingFeature"
   ```
4. Push to the branch
   ```bash
   git push origin feature/AmazingFeature
   ```
5. Open a Pull Request

---

## Setup

```bash
npm install
node index.js
```

---

## License

Distributed under the **MIT License**. See `LICENSE` for details.

---

## Acknowledgments

- Discord.js
- Node Web Audio API
- FFmpeg

---

⭐ If you find this project useful, please give it a star!\
Made with ❤️ by **FWDLps**

