import { Message } from "discord.js";
import defineEvent from "../utils/defineEvents";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default defineEvent({
  name: "MessageCreate",
  once: false,
  execute: async (message: Message) => {
    if (message.attachments.size > 0) {
      for (const attachment of message.attachments.values()) {
        const urlWithoutParams = attachment.url.split("?")[0];
        const fileExtension = (
          urlWithoutParams.split(".").pop() ?? ""
        ).toLowerCase();

        if (["png", "jpg", "jpeg", "gif"].includes(fileExtension)) {
          try {
            console.log(`Scanning image with GPT-4o...`);

            const responseAI = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                {
                  role: "system",
                  content:
                    "Identify any visible characters or words in this image.",
                },
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: "Analyze this image and extract any readable text.",
                    },
                    { type: "image_url", image_url: { url: attachment.url } },
                  ],
                },
              ],
            });

            const detectedText =
              responseAI.choices?.[0]?.message?.content || "";
            console.log(`Extracted text: ${detectedText}`);

            if (detectedText.toLowerCase().includes("onlyfans")) {
              await message.delete();
              console.log(`Deleted a message containing "onlyfans"`);

              const channel = message.guild?.channels.cache.get(
                message.channelId
              );
              if (!channel || !channel.isTextBased()) {
                return;
              }

              channel
                .send({
                  content: `🚫 ${message.author}, your message was removed because it contained restricted content.`,
                  allowedMentions: { users: [message.author.id] },
                })
                .then((msg) => {
                  setTimeout(() => msg.delete().catch(() => {}), 5000);
                });
            }
          } catch (error) {
            console.error("Error processing image:", error);
          }
        }
      }
    }
  },
});
