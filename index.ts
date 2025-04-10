import { Client, GatewayIntentBits } from "discord.js";
import { loadCommands, loadEvents } from "./utils/loaders";

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.login(process.env.DISCORD_TOKEN);

loadCommands("./commands/**/*.ts");
loadEvents("./events/**/*.ts");

client.on("ready", () => {
  if (client.user) {
    console.log(`Logged in as ${client.user.tag}`);
  }
});
