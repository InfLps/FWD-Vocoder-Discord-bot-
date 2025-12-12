/*
    * deploy-commands.js
    * Registers slash commands for the Discord bot.
    * Uses discord.js v14 REST API to register commands globally.
    * Author: InfLps (FWDFactory)
    * Date: 2025-12-07
    * License: MIT
 */

import { REST, Routes, SlashCommandBuilder } from "discord.js";                                     // Discord.js v14
import { config } from 'dotenv';                                                                    // For environment variable management
import path from "path";                                                                            // Path utilities
import { fileURLToPath } from 'url';                                                                // For __dirname in ES modules

// Setup environment
const __filename = fileURLToPath(import.meta.url);                                                  // Get current file path
const __dirname = path.dirname(__filename);                                                         // Get current directory
config({ path: path.resolve(__dirname, '.env') });                                                  // Load .env variables

const TOKEN = process.env.DISCORD_TOKEN;                                                            // Discord Bot Token
const APP_ID = process.env.DISCORD_ID;                                                              // Application (Bot) ID

if (!TOKEN || !APP_ID) {
    console.error("❌ Missing DISCORD_TOKEN or DISCORD_ID in .env");                                // Check for required env variables
    process.exit(1);                                                                                // Exit if missing
}                                                                                                   // Validate env variables

// Slash Command Definition (using 'vocode' name)
const fwdVocCommand = new SlashCommandBuilder()
    .setName("vocode")                                                                              // Command name
    .setDescription("Vocodes a modulator + carrier with optional params.")                          // Command description
    .addAttachmentOption(o => o.setName("modulator").setDescription("Modulator audio").setRequired(true)) // Modulator file
    .addAttachmentOption(o => o.setName("carrier").setDescription("Carrier audio").setRequired(true)) // Carrier file
    .addIntegerOption(o => o.setName("bands").setDescription("Approx. band count (8–64). Default: 32").setMinValue(8).setMaxValue(64)) // Bands
    .addNumberOption(o => o.setName("strength").setDescription("Vocoder strength 0.0–1.0 (default: 1.0)").setMinValue(0.0).setMaxValue(1.0)); // Strength

const commands = [fwdVocCommand.toJSON()];                                                          // Command array

// Deployment
const rest = new REST({ version: "10" }).setToken(TOKEN);                                           // REST client for Discord API

(async () => {
    try {
        console.log(`⏳ Started refreshing ${commands.length} application (/) commands...`);        // Log start
        const data = await rest.put(
            Routes.applicationCommands(APP_ID),
            { body: commands },                                                                     // Register commands
        );                                                                                          // Await registration
        console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);           // Log success
    } catch (error) {
        console.error("❌ Failed to register commands:", error);                                    // Log errors
    }
})();                                                                                               // IIFE for async/await usage