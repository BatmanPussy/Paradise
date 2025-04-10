import { Guild } from "discord.js";
import defineEvent from "../utils/defineEvents";
import { prisma } from "../db";

export default defineEvent({
  name: "GuildCreate",
  once: true,
  execute: async (guild: Guild) => {
    let guildData = await prisma.guild.findUnique({
      where: { guildId: guild.id! },
    });

    if (!guildData) {
      console.log("Guild not found, inserting new guild");

      const newGuild = await prisma.guild.create({
        data: { guildId: guild.id! },
      });

      guildData = newGuild;
    }
  },
});
