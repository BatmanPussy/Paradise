import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import defineCommand from "../utils/defineCommand";
import { prisma } from "../db";

export default defineCommand({
  data: {
    name: "logs",
    description: "Set up logging for your server",
    default_member_permissions: PermissionFlagsBits.ManageGuild.toString(),
    options: [
      {
        name: "enable",
        description: "Enable logging for your server",
        type: ApplicationCommandOptionType.Boolean,
        required: true,
      },
    ],
  },

  execute: async (interaction, client) => {
    const { options } = interaction;

    const enable = options.getBoolean("enable");

    if (!interaction.guildId) {
      await interaction.reply({
        content: "This command can only be used in a server",
        flags: "Ephemeral",
      });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        content:
          "❌ You need the 'Manage Server' permission to use this command.",
        flags: "Ephemeral",
      });
      return;
    }

    await interaction.deferReply({ flags: "Ephemeral" });

    const logging = await prisma.logging.findFirst({
      where: {
        guildId: interaction.guildId,
      },
    });

    if (!logging) {
      await prisma.logging.create({
        data: {
          guildId: interaction.guildId,
          channelId: interaction.channelId,
          enabled: enable ? true : false,
        },
      });
    } else {
      await prisma.logging.update({
        where: {
          id: logging.id,
        },
        data: {
          enabled: enable ? true : false,
        },
      });
    }

    await interaction.editReply({
      content: `Logging has been ${enable ? "enabled" : "disabled"}`,
    });
  },
});
