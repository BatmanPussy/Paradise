import type { CacheType, Client, Interaction } from "discord.js";
import defineEvent from "../utils/defineEvents";
import { commands } from "../utils/loaders";
import { client } from "..";

export default defineEvent({
  name: "InteractionCreate",
  once: false,

  execute: async (interaction: Interaction<CacheType>) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);
    if (!command) return;

    try {
      command.execute(interaction, client as Client<true>);
    } catch (error: any) {
      console.error(error.message);

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "An error occurred while executing this command",
          ephemeral: true,
        });
      }
    }
  },
});
