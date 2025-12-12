/**Discord Bot for High-Quality Vocoder Processing
 * Uses slash commands to accept modulator and carrier audio files,
 * processes them with a vocoder engine, and returns the vocoded output. 
 * Handles a queue to manage multiple requests efficiently.
 * Author: InfLps (FWDFactory)
 * Date: 2025-12-07
 * License: MIT
 */

import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes
} from "discord.js";                                       // Discord.js v14
import { config } from "dotenv";                           // For environment variable management
import { promises as fs } from "fs";                       // File system promises API
import path from "path";                                   // Path utilities
import { v4 as uuidv4 } from "uuid";                       // For generating unique filenames
import fetch from "node-fetch";                            // For fetching audio files

import { runVocoder } from "./vocoder/vocoderEngine.js";   // Vocoder engine

// Load environment variables from .env file
config();                                                  // Initialize dotenv

const { writeFile, unlink, mkdir } = fs;                   // Destructure needed fs functions
const TOKEN = process.env.DISCORD_TOKEN;                   // Discord Bot Token
const TEMP_DIR = path.join(process.cwd(), "temp");         // Temporary directory for audio files

// QUEUE SYSTEM
const processQueue = [];
let isProcessing = false;

async function ensureTempDir() {
  await mkdir(TEMP_DIR, { recursive: true });
}                                                           // Ensure temp directory exists

async function runQueue() {
  if (isProcessing || processQueue.length === 0) return;    // Early exit if already processing or queue empty
  isProcessing = true;                                      // Set processing flag

  const task = processQueue.shift();                        // Get next task
  try {
    await task();                                           // Execute task
  } catch (e) {
    console.error("Queue task error:", e);                  // Log errors
  } finally {
    isProcessing = false;                                   // Reset processing flag
    if (processQueue.length > 0) setTimeout(runQueue, 100); // Process next task
  }
}                                                           // Simple async queue runner

// DISCORD BOT SETUP
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});                                                         // Discord Client

// COMMAND REGISTRATION

client.once("ready", async () => {
  await ensureTempDir();                                    // Ensure temp directory exists
  console.log(`Bot online as ${client.user.tag}`);          // Log bot online status

  const commands = [
    new SlashCommandBuilder()
      .setName("vocode")
      .setDescription("Apply robot vocoder (Modulator onto Carrier)")
      .addAttachmentOption((o) =>
        o.setName("modulator").setDescription("Speech/Voice input").setRequired(true)
      )
      .addAttachmentOption((o) =>
        o.setName("carrier").setDescription("Synth/Noise carrier").setRequired(true)
      )
      .addIntegerOption((o) => 
        o.setName("width")
         .setDescription("Bandwidth (0 = Robotic/Thin, 100 = Breathy/Wide). Default: 50")
         .setMinValue(0)
         .setMaxValue(100)
         .setRequired(false)
      )
      .toJSON(),
  ];                                                        // Command definitions

  const rest = new REST({ version: "10" }).setToken(TOKEN); // REST client for Discord API
  try {
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands,
    });                                                     // Register commands globally
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

  processQueue.push(async () => {
    let outPath = null;                                     // Track output file for cleanup
    try {
      const mod = interaction.options.getAttachment("modulator"); // Get attachments
      const car = interaction.options.getAttachment("carrier"); // Get attachments
      
      // Default width to 50 if not provided
      const widthVal = interaction.options.getInteger("width") ?? 50; // Get width parameter

      const validTypes = ["audio/"];                        // Basic check for audio MIME types
      if (!mod.contentType?.startsWith("audio/") || !car.contentType?.startsWith("audio/")) {
        throw new Error("Files must be audio formats.");    // Validate audio files
      }                                                     // Basic audio type check

      await interaction.editReply("📥 Downloading audio streams...");  // Update status

      const [modBuffer, carBuffer] = await Promise.all([
        fetch(mod.url).then((r) => r.arrayBuffer()),
        fetch(car.url).then((r) => r.arrayBuffer()),
      ]);                                                   // Download audio files

      await interaction.editReply("🎚 Processing audio (High Quality)..."); // Update status

      // Pass the width parameter to the engine
      const wavBuffer = await runVocoder(modBuffer, carBuffer, widthVal); // Run vocoder

      const fileName = `vocoded_${uuidv4()}.wav`;           // Unique output filename
      outPath = path.join(TEMP_DIR, fileName);              // Full output path
      await writeFile(outPath, wavBuffer);                  // Write output file

      await interaction.editReply({
        content: `✅ **Vocoding complete!**\n🎛️ Width: ${widthVal}%`,
        files: [{ attachment: outPath, name: fileName }],
      });                                                   // Send output file

    } catch (err) {
      console.error("Processing error:", err);              // Log error
      try {
        await interaction.editReply(`❌ Error: ${err.message}`); // Send error message
      } catch (e) { }                                       // Ignore edit errors
    } finally {
      if (outPath) {
        setTimeout(() => unlink(outPath).catch(() => {}), 60 * 1000); // Cleanup output file after 1 minute
      }                                                     // Cleanup output file after 1 minute
    }
  }); 

  runQueue();                                               // Start processing the queue
});                                                         // Interaction handler

// START BOT

client.login(TOKEN);                                        // Log in to Discord
