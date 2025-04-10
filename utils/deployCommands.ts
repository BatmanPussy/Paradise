import { Glob } from "bun";
import { REST, Routes } from "discord.js";
import path from "path";
import ora from "ora";
import type { Command } from "../types/command";

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

const commands: Command[] = [];
const commandsGlob = new Glob("./commands/**/*.ts");

for await (const file of commandsGlob.scan(".")) {
  try {
    const filePath = path.resolve(process.cwd(), file);
    const { data, execute } = await import(filePath).then((m) => m.default);

    if (!data || !execute) {
      console.error(`Missing data or execute function in ${filePath}`);
      continue;
    }

    console.log(`Loaded command: ${data.name}`);
    commands.push(data);
  } catch (error) {
    console.error(`Failed to load command from ${file}:`, error);
  }
}

if (commands.length === 0) {
  console.error("No commands to deploy.");
  process.exit(1);
}

console.log(`Deploying ${commands.length} command(s)...`);

const rest = new REST().setToken(TOKEN!);

const spinner = ora("Started deploying commands...").start();

try {
  const response = await rest.put(Routes.applicationCommands(CLIENT_ID!), {
    body: commands,
  });
  console.log(`Deployment response:`, response);
  spinner.succeed(`Successfully deployed ${commands.length} command(s)`);
  process.exit(0);
} catch (error) {
  console.error(`Failed to deploy commands:`, error);
  spinner.fail(`Failed to deploy commands: ${error}`);
}
