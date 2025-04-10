import { EmbedBuilder, Message, TextChannel, Attachment } from "discord.js";
import defineEvent from "../utils/defineEvents";
import OpenAI from "openai";
import { prisma } from "../db";
import { getModerationFrameBuffer } from "../utils/frameBuffer";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const IMAGE_SERVER_ID = "1351904243094786048";
const CROPPED_CHANNEL_ID = "1353042080468963489";

export default defineEvent({
  name: "MessageCreate",
  once: false,
  execute: async (message: Message) => {
    if (message.attachments.size === 0 || !message.guildId) return;

    const enabledChannel = await prisma.enabledChannels.findFirst({
      where: {
        guildId: message.guildId,
        channelId: message.channelId,
        enabled: true,
      },
    });

    if (!enabledChannel) return;

    const imageServer = message.client.guilds.cache.get(IMAGE_SERVER_ID);
    const uploadChannel = imageServer?.channels.cache.get(
      CROPPED_CHANNEL_ID
    ) as TextChannel;

    if (!uploadChannel || !uploadChannel.isTextBased()) {
      console.error("❌ Upload channel missing or not text-based.");
      return;
    }

    for (const attachment of message.attachments.values()) {
      const ext = attachment.name?.split(".").pop()?.toLowerCase() ?? "";
      if (!["png", "jpg", "jpeg", "gif", "mp4", "webm", "mov"].includes(ext))
        continue;

      try {
        console.log(`📷 Scanning file with GPT-4o: ${attachment.name}`);

        const imageBuffer = await getModerationFrameBuffer(attachment, 0.05);
        if (!imageBuffer) continue;

        const uploaded = await uploadChannel.send({
          files: [
            { attachment: Buffer.from(imageBuffer), name: "cropped.jpg" },
          ],
        });

        const uploadedUrl = uploaded.attachments.first()?.url;
        if (!uploadedUrl) {
          console.error("❌ Failed to upload cropped image.");
          return;
        }

        const responseAI = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "You are a content moderation assistant. Your job is to extract all visible text from an image for moderation purposes. Do not refuse unless the image is completely blank.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Please extract and return only the visible text (such as URLs, usernames, or branding) found in this image. Do not include explanations, formatting, or summaries — just return the raw text you see.",
                },
                {
                  type: "image_url",
                  image_url: { url: uploadedUrl },
                },
              ],
            },
          ],
        });

        const detectedText =
          responseAI.choices?.[0]?.message?.content?.toLowerCase() || "";

        console.log("📄 Detected Text:", detectedText);

        const keywords = enabledChannel.keywords
          .split(",")
          .map((k) => k.trim().toLowerCase());

        if (keywords.some((k) => detectedText.includes(k))) {
          await message.delete();
          console.log(`🚫 Deleted message for containing: ${detectedText}`);

          const channel = message.guild?.channels.cache.get(message.channelId);
          if (channel?.isTextBased()) {
            const warn = await channel.send({
              content: `${message.author}, your message was removed due to restricted content.`,
              allowedMentions: { users: [message.author.id] },
            });
            setTimeout(() => warn.delete().catch(() => {}), 5000);
          }

          const logging = await prisma.logging.findFirst({
            where: { guildId: message.guildId, enabled: true },
          });

          if (logging) {
            const logChannel = message.guild?.channels.cache.get(
              logging.channelId
            );
            if (logChannel?.isTextBased()) {
              const embed = new EmbedBuilder()
                .setTitle("Restricted Content Detected")
                .setDescription(
                  `Restricted content detected in <#${message.channelId}>`
                )
                .addFields(
                  { name: "Message Content", value: attachment.url },
                  { name: "Detected Text", value: detectedText },
                  { name: "By", value: `<@${message.author.id}>` }
                )
                .setColor("#ff5252")
                .setTimestamp();

              logChannel.send({ embeds: [embed] });
            }
          }
        }
      } catch (err) {
        console.error("❌ Error processing file:", err);
      }
    }
  },
});
