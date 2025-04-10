import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import defineCommand from "../utils/defineCommand";
import { prisma } from "../db";

export default defineCommand({
  data: {
    name: "detect",
    description: "Set up channel for detecting restricted content",
    default_member_permissions: PermissionFlagsBits.ManageGuild.toString(),
    options: [
      {
        name: "enable",
        description: "Enable detection for restricted content in this channel",
        type: ApplicationCommandOptionType.Boolean,
        required: true,
      },
      {
        name: "keywords",
        description: "List of keywords to detect (separated by comma)",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },

  execute: async (interaction, client) => {
    const { options } = interaction;

    const enable = options.getBoolean("enable");
    const keywords = options.getString("keywords")?.trim();

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

    if (!keywords) {
      await interaction.reply({
        content: "Please provide a list of keywords to detect",
        flags: "Ephemeral",
      });
      return;
    }

    await interaction.deferReply({ flags: "Ephemeral" });

    const enabledChannel = await prisma.enabledChannels.findFirst({
      where: {
        guildId: interaction.guildId,
        channelId: interaction.channelId,
      },
    });

    if (!enabledChannel) {
      await prisma.enabledChannels.create({
        data: {
          guildId: interaction.guildId,
          channelId: interaction.channelId,
          enabled: enable ? true : false,
          keywords: keywords,
        },
      });
    } else {
      await prisma.enabledChannels.update({
        where: {
          id: enabledChannel.id,
        },
        data: {
          enabled: enable ? true : false,
        },
      });
    }

    await interaction.editReply({
      content: `Content detection has been ${
        enable ? "enabled" : "disabled"
      } for this channel`,
    });
  },
});
