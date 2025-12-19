/**Discord Bot for High-Quality Vocoder Processing
 * Now with Video and M4A Support!
 * Supports: MP3, WAV, M4A, OGG, FLAC, MP4, MOV, MKV, AVI, etc.
 * Uses FFmpeg to convert any audio/video input to WAV before processing.
 * Author: InfLps (FWDFactory)
 * Date: 2025-12-18
 * License: MIT
 */

import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes
} from "discord.js";                                        // Discord.js v14
import { config } from "dotenv";                            // For environment variable management
import { promises as fs } from "fs";                        // File system promises API
import path from "path";                                    // Path utilities
import { v4 as uuidv4 } from "uuid";                        // For generating unique filenames
import fetch from "node-fetch";                             // For fetching audio files
import ffmpeg from "fluent-ffmpeg";                         // FFmpeg wrapper
import ffmpegPath from "ffmpeg-static";                     // Static FFmpeg binary
import { runVocoder } from "./vocoder/vocoderEngine.js";    // Vocoder engine

ffmpeg.setFfmpegPath(ffmpegPath);                           // Set FFmpeg binary path
config();                                                   // Initialize dotenv

const { writeFile, unlink, mkdir, readFile, readdir, stat } = fs; // Destructure needed fs functions
const TOKEN = process.env.DISCORD_TOKEN;                    // Discord Bot Token
const TEMP_DIR = path.join(process.cwd(), "temp");          // Temporary directory for audio files

// QUEUE SYSTEM
const processQueue = [];                                    // Task queue
let isProcessing = false;                                   // Processing flag

// ENSURE TEMP DIRECTORY EXISTS
async function ensureTempDir() {
  await mkdir(TEMP_DIR, { recursive: true });
}                                                           // Ensure temp directory exists

// CLEAN ORPHANED TEMP FILES ON STARTUP
async function cleanTempDir() {
  try {
    const files = await readdir(TEMP_DIR);
    const now = Date.now();

    for (const file of files) {
      const fullPath = path.join(TEMP_DIR, file);
      const fileStat = await stat(fullPath);

      // Delete files older than 10 minutes
      if (now - fileStat.mtimeMs > 10 * 60 * 1000) {
        await unlink(fullPath).catch(() => {});
      }
    }
  } catch (e) {
    console.warn("Temp cleanup skipped:", e.message);
  }
}

// CONVERT ANY MEDIA TO WAV BUFFER
async function downloadAndConvert(attachmentUrl, originalFilename) {
  const uniqueId = uuidv4();                                // Unique ID for temp files  
  const ext = path.extname(originalFilename);               // Original file extension
  const inputPath = path.join(TEMP_DIR, `raw_${uniqueId}${ext}`); // Temp input file path
  const outputPath = path.join(TEMP_DIR, `clean_${uniqueId}.wav`); // Temp output WAV file path
  const res = await fetch(attachmentUrl);                   // Fetch the attachment
  const buffer = await res.arrayBuffer();                   // Read as ArrayBuffer
  await writeFile(inputPath, Buffer.from(buffer));          // Save to temp input file

  return new Promise((resolve, reject) => {                 // Return a promise for async handling
    ffmpeg(inputPath)
      .toFormat('wav')                                      // Convert to WAV format
      .audioFrequency(48000)                                // Standardize sample rate
      .on('error', async (err) => {                         // Handle conversion errors
        await unlink(inputPath).catch(() => {});            // Ignore unlink errors
        await unlink(outputPath).catch(() => {});
        reject(err);                                        // Reject promise on error
      })
      .on('end', async () => {                              // On successful conversion
        try {
          const wavBuffer = await readFile(outputPath);     // Read converted WAV file
          await unlink(inputPath);                          // Clean up input file
          await unlink(outputPath);                         // Clean up output file
          resolve(wavBuffer);                               // Resolve promise with WAV buffer
        } catch (e) {                                       // Handle read/unlink errors
          reject(e);                                        // Reject promise on error
        }
      })
      .save(outputPath);                                    // Save converted file
  });                                                       // End of Promise
}                                                           // End of downloadAndConvert function

// QUEUE PROCESSING FUNCTION
async function runQueue() {                                 // Simple async queue runner
  if (isProcessing || processQueue.length === 0) return;    // Early exit if already processing or queue empty
  isProcessing = true;                                      // Set processing flag

  const task = processQueue.shift();                        // Get next task
  try {
    await task();                                           // Execute task
  } catch (e) {                                             // Handle task errors
    console.error("Queue task error:", e);                  // Log errors
  } finally {                                               // Finalize
    isProcessing = false;                                   // Reset processing flag
    if (processQueue.length > 0) setImmediate(runQueue);    // Process next task immediately
  }
}

// DISCORD BOT SETUP
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});                                                         // Discord Client

// COMMAND REGISTRATION
client.once("ready", async () => {
  await ensureTempDir();                                    // Ensure temp directory exists
  await cleanTempDir();                                     // Clean orphaned temp files
  console.log(`Bot online as ${client.user.tag}`);          // Log bot online status

  const commands = [
    new SlashCommandBuilder()
      .setName("vocode")
      .setDescription("Apply robot vocoder (Supports video and audio attachments)")
      .addAttachmentOption((o) =>
        o.setName("modulator").setDescription("Voice (Video or Audio accepted)").setRequired(true)
      )
      .addAttachmentOption((o) =>
        o.setName("carrier").setDescription("Synth/Noise (Video or Audio accepted)").setRequired(true)
      )
      .addIntegerOption((o) => 
        o.setName("width")
         .setDescription("Bandwidth (0-100). Default: 50")
         .setMinValue(0)
         .setMaxValue(100)
         .setRequired(false)
      )
      .toJSON(),
  ];                                                        // Command definitions

  const rest = new REST({ version: "10" }).setToken(TOKEN); // REST client for Discord API
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands }); // Register commands globally 
    console.log("Slash commands registered.");              // Success log  
  } catch (err) {                                           // Error handling  
    console.error("Command registration failed:", err);     // Log error
  }
});                                                         // Bot ready event

// COMMAND HANDLER
client.on("interactionCreate", async (interaction) => {     // Handle interactions
  if (!interaction.isChatInputCommand()) return;            // Only handle chat input commands
  if (interaction.commandName !== "vocode") return;         // Only handle /vocode

  await interaction.deferReply();                           // Acknowledge command

  // Enqueue processing task
  processQueue.push(async () => {                           // Enqueue processing task
    let outPath = null;                                     // Output file path for cleanup
    try {                                                   // Main processing block
      const mod = interaction.options.getAttachment("modulator"); 
      const car = interaction.options.getAttachment("carrier"); // Get attachments
      const widthVal = interaction.options.getInteger("width") ?? 50; // Get width or default to 50
      const validMime = (type) => type && (type.startsWith("audio/") || type.startsWith("video/")); // Validate MIME types

      if (!validMime(mod.contentType) || !validMime(car.contentType)) { // Validate attachments
        throw new Error("Files must be Audio or Video.");   // Error if invalid types
      }

      await interaction.editReply("📥 Downloading & Converting Media...");

      // Download and convert both attachments to WAV buffers
      const [modBuffer, carBuffer] = await Promise.all([
        downloadAndConvert(mod.url, mod.name),
        downloadAndConvert(car.url, car.name)
      ]);                                                   // End Promise.all

      await interaction.editReply("🎚 Processing Vocoder Engine...");

      // The engine receives clean WAV buffers now, so it's happy
      const resultBuffer = await runVocoder(modBuffer, carBuffer, widthVal); // Run vocoder engine

      // Save result to temp file for sending
      const fileName = `vocoded_${uuidv4()}.wav`;           // Unique output filename
      outPath = path.join(TEMP_DIR, fileName);              // Full output path
      await writeFile(outPath, resultBuffer);               // Write output file

      // SEND AS BUFFER (prevents file lock issues)
      const sendBuffer = Buffer.from(resultBuffer);         // Detached buffer copy

      await interaction.editReply({                         // Send result back to user
        content: `✅ **Vocoding complete!**\n🎛️ Width: ${widthVal}%`,
        files: [{ attachment: sendBuffer, name: fileName }],
      });                                                   // End editReply

    } catch (err) {                                         // Error handling
      console.error("Processing error:", err);              // Log error
      try {
        await interaction.editReply(`❌ Error: ${err.message}`); // Notify user of error
      } catch (e) { }                                       // Ignore reply errors
    } finally {                                             // Cleanup
      if (outPath) {
        await unlink(outPath).catch(() => {});              // Immediate cleanup (safe)
      }
    }
  });                                                       // End of queued task

  runQueue();                                               // Start processing the queue
});                                                         // End interactionCreate handler

// CLEAN TEMP FILES ON EXIT
async function shutdownCleanup() {
  try {
    const files = await readdir(TEMP_DIR);
    for (const file of files) {
      await unlink(path.join(TEMP_DIR, file)).catch(() => {});
    }
  } catch {}
}

process.on("SIGINT", shutdownCleanup);
process.on("SIGTERM", shutdownCleanup);
process.on("exit", shutdownCleanup);

// LOGIN BOT
client.login(TOKEN);                                       // Log in to Discord
