/**
 * Discord Bot: FWD Vocoder
 * Author: FWDLps (FWDFactoryNetwork)
 */

import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  ActivityType
} from "discord.js";
import { config } from "dotenv";
import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { runVocoder } from "./vocoder/vocoderEngine.js";

ffmpeg.setFfmpegPath(ffmpegPath);
config();

const { writeFile, unlink, mkdir, readFile, readdir, stat } = fs;
const TOKEN = process.env.DISCORD_TOKEN;
const TOPGG_TOKEN = process.env.TOPGG_TOKEN;
const TEMP_DIR = path.join(process.cwd(), "temp");

//COOLDOWN CONFIG
const COOLDOWN_MS = Number(process.env.COOLDOWN_MS) || 22000;
const cooldowns = new Map();

//CONSOLE-ONLY ANNOUNCEMENT MODE
const ANNOUNCE = process.env.ANNOUNCE === "true" || process.argv.includes("--announce");

function announce(type, message) {
  if (!ANNOUNCE) return;
  const timestamp = new Date().toISOString();
  console.log(`[ANNOUNCE][${type.toUpperCase()}] ${timestamp} — ${message}`);
}

const processQueue = [];
let isProcessing = false;

//PRESENCE & TOP.GG UPDATER (OPT)
async function updateBotPresence(client) {
  if (!client.user) return;
  const serverCount = client.guilds.cache.size;

  client.user.setActivity(`over ${serverCount} servers`, {
    type: ActivityType.Watching
  });

  if (TOPGG_TOKEN) {
    try {
      await fetch(`https://top.gg/api/bots/${client.user.id}/stats`, {
        method: "POST",
        headers: { Authorization: TOPGG_TOKEN, "Content-Type": "application/json" },
        body: JSON.stringify({ server_count: serverCount }),
      });
      announce("stats", `Top.gg stats updated (${serverCount} servers).`);
    } catch (err) {
      console.error(`[Top.gg] Error:`, err.message);
      announce("error", `Top.gg stats update failed: ${err.message}`);
    }
  }
}

//FILE UTILITIES
async function ensureTempDir() {
  await mkdir(TEMP_DIR, { recursive: true });
}

async function cleanTempDir() {
  try {
    const files = await readdir(TEMP_DIR);
    const now = Date.now();
    for (const file of files) {
      const fullPath = path.join(TEMP_DIR, file);
      const fileStat = await stat(fullPath);
      if (now - fileStat.mtimeMs > 10 * 60 * 1000) {
        await unlink(fullPath).catch(() => {});
      }
    }
  } catch (e) {}
}

async function downloadAndConvert(attachmentUrl, originalFilename, limitDuration = null) {
  const uniqueId = uuidv4();
  const ext = path.extname(originalFilename) || ".tmp";
  const inputPath = path.join(TEMP_DIR, `raw_${uniqueId}${ext}`);
  const outputPath = path.join(TEMP_DIR, `clean_${uniqueId}.wav`);

  const res = await fetch(attachmentUrl);
  if (!res.ok) {
    throw new Error(`Failed to download attachment (HTTP ${res.status})`);
  }
  const buffer = await res.arrayBuffer();
  await writeFile(inputPath, Buffer.from(buffer));

  return new Promise((resolve, reject) => {
    const command = ffmpeg().input(inputPath);

    if (limitDuration) {
      command.inputOptions(['-stream_loop', '-1']);
      command.duration(limitDuration + 0.5);
    }

    command
      .toFormat('wav')
      .audioFrequency(48000)
      .on('error', async (err) => {
        await unlink(inputPath).catch(() => {});
        await unlink(outputPath).catch(() => {});
        reject(err);
      })
      .on('end', async () => {
        try {
          const wavBuffer = await readFile(outputPath);
          await unlink(inputPath).catch(() => {});
          await unlink(outputPath).catch(() => {});
          resolve(wavBuffer);
        } catch (e) { reject(e); }
      })
      .save(outputPath);
  });
}

//QUEUE HANDLER
async function runQueue() {
  if (isProcessing || processQueue.length === 0) return;
  isProcessing = true;
  const task = processQueue.shift();
  try { await task(); } catch (e) { console.error("Queue error:", e); }
  finally {
    isProcessing = false;
    if (processQueue.length > 0) setImmediate(runQueue);
  }
}

//DISCORD CLIENT
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", async () => {
  await ensureTempDir();
  await cleanTempDir();
  console.log(`Logged in as ${client.user.tag}`);
  announce("startup", `Bot logged in as ${client.user.tag}.`);
  await updateBotPresence(client);
  setInterval(() => updateBotPresence(client), 30 * 60 * 1000);

  const commands = [
    new SlashCommandBuilder()
      .setName("vocode")
      .setDescription("Apply robot vocoder")
      .addAttachmentOption(o => o.setName("modulator").setDescription("Voice").setRequired(true))
      .addAttachmentOption(o => o.setName("carrier").setDescription("Synth").setRequired(true))
      .addIntegerOption(o => o.setName("width").setDescription("Bandwidth (0-100)").setMinValue(0).setMaxValue(100))
      .toJSON(),
  ];

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log("Commands registered.");
    announce("startup", "Slash commands registered successfully.");
  } catch (err) {
    console.error(err);
    announce("error", `Command registration failed: ${err.message}`);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "vocode") return;

  //COOLDOWN CHECK
  const userId = interaction.user.id;
  const now = Date.now();
  const lastUsed = cooldowns.get(userId);

  if (lastUsed && now - lastUsed < COOLDOWN_MS) {
    const remaining = ((COOLDOWN_MS - (now - lastUsed)) / 1000).toFixed(1);
    announce("cooldown", `${interaction.user.tag} hit cooldown (${remaining}s remaining).`);
    await interaction.reply({
      content: `⏳ Please wait **${remaining}s** before processing another file.`,
      ephemeral: true,
    }).catch(() => {});
    return;
  }
  cooldowns.set(userId, now);

  await interaction.deferReply();
  announce("command", `${interaction.user.tag} queued a /vocode request.`);

  processQueue.push(async () => {
    let outPath = null;
    try {
      const mod = interaction.options.getAttachment("modulator");
      const car = interaction.options.getAttachment("carrier");
      const widthVal = interaction.options.getInteger("width") ?? 50;
      const modBuffer = await downloadAndConvert(mod.url, mod.name);
      const carBuffer = await downloadAndConvert(car.url, car.name, mod.duration);

      const resultBuffer = await runVocoder(modBuffer, carBuffer, widthVal);
      const fileName = `vocoded_${uuidv4()}.wav`;
      outPath = path.join(TEMP_DIR, fileName);
      await writeFile(outPath, resultBuffer);

      await interaction.editReply({
        content: `✅ **Vocoding complete!** (Width: ${widthVal}%)`,
        files: [{ attachment: resultBuffer, name: fileName }],
      });
      announce("success", `Vocoding completed for ${interaction.user.tag}.`);
    } catch (err) {
      console.error(err);
      announce("error", `Vocoding failed for ${interaction.user.tag}: ${err.message}`);
      await interaction.editReply(`❌ Error: ${err.message}`).catch(() => {});
    } finally {
      if (outPath) await unlink(outPath).catch(() => {});
    }
  });
  runQueue();
});

client.on("guildCreate", (guild) => {
  announce("guild", `Joined new server: ${guild.name} (${guild.id}).`);
  updateBotPresence(client);
});
client.on("guildDelete", (guild) => {
  announce("guild", `Removed from server: ${guild.name} (${guild.id}).`);
  updateBotPresence(client);
});

async function shutdown() {
  console.log("\n[Shutdown] Cleaning up...");
  announce("shutdown", "Bot is shutting down, cleaning temp files.");
  const forceQuit = setTimeout(() => process.exit(1), 3000);
  try {
    if (client) client.destroy();
    const files = await readdir(TEMP_DIR).catch(() => []);
    for (const file of files) {
      await unlink(path.join(TEMP_DIR, file)).catch(() => {});
    }
    clearTimeout(forceQuit);
    process.exit(0);
  } catch (e) {
    process.exit(1);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

client.login(TOKEN);
