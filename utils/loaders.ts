import path from "path";
import { Glob } from "bun";
import { Events, type ClientEvents } from "discord.js";
import { client } from "..";

export const loadEvents = async (pathToSearch: string) => {
  const eventsGlob = new Glob(pathToSearch);

  for await (const file of eventsGlob.scan(".")) {
    const filePath = path.resolve(process.cwd(), file);
    const { name, once, execute } = await import(filePath).then(
      (m) => m.default
    );

    const eventName = Events[name as keyof typeof Events] as keyof ClientEvents;

    console.log(`Loading event: ${eventName}`);

    if (!name || !execute)
      throw new Error(`Missing name or execute function in ${filePath}`);

    if (once) {
      client.once(eventName, (...args) => {
        execute(client, ...args);
        console.log(`Event ${eventName} executed`);
      });
    } else {
      client.on(eventName, (...args) => {
        execute(...args);
        console.log(`Event ${eventName} executed`);
      });
    }
  }
};
