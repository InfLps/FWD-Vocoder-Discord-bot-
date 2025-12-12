/**
 * interactionCreate.js
 * 
 * Handles interaction creation events for the Discord bot.
 * Listens for slash command interactions and executes the corresponding command logic.
 */

export default {
  name: "interactionCreate",
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;                                                    // Only handle chat input commands

    const command = client.commands.get(interaction.commandName);                                     // Get the command from the collection
    if (!command) return;                                                                             // If command not found, exit

    try {
      // Defer reply to allow more time for processing
        await interaction.deferReply();                                                               // Acknowledge command
        await command.execute(interaction);                                                           // Execute the command
    } catch (err) {
      console.error(err);                                                                             // Log the error

      // Inform the user of the error
      if (interaction.deferred || interaction.replied) {
          await interaction.editReply("❌ An error occurred while executing the command.");          // Edit deferred reply
      } else {
          await interaction.reply({ content: "❌ An immediate error occurred.", ephemeral: true });  // Immediate reply
      }
    }
  }                                                                                                   // End of execute function
}; 