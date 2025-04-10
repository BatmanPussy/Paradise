import axios from "axios";
import sharp from "sharp";
import { Attachment } from "discord.js";
import { spawn } from "child_process";
import { writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import os from "os";

export async function getModerationFrameBuffer(
  attachment: Attachment,
  cropPercent = 0.1
): Promise<Uint8Array | null> {
  try {
    const ext = attachment.name?.split(".").pop()?.toLowerCase() || "";
    const isVideo = ["mp4", "webm", "mov"].includes(ext);

    const response = await axios.get(attachment.url, {
      responseType: "arraybuffer",
    });

    let imageBuffer: Buffer;

    console.log(`📷 Downloading file: ${attachment.name}`);

    if (isVideo) {
      console.log(`🎞️ Extracting frame from video: ${attachment.name}`);

      const tempDir = os.tmpdir();
      const inputPath = path.join(tempDir, `video-${Date.now()}.${ext}`);
      const outputPath = path.join(tempDir, `frame-${Date.now()}.jpg`);
      await writeFile(inputPath, response.data);

      const ffmpegPath = "C:\\ffmpeg-7.1.1\\bin\\ffmpeg.exe";

      await new Promise<void>((resolve, reject) => {
        const ffmpeg = spawn(ffmpegPath, [
          "-i",
          inputPath,
          "-frames:v",
          "1",
          "-q:v",
          "2",
          outputPath,
        ]);

        ffmpeg.on("close", async (code) => {
          if (code !== 0) return reject(new Error("FFmpeg failed"));
          resolve();
        });
      });

      console.log(`🎞️ Extracted frame from video: ${outputPath}`);

      imageBuffer = await readFile(outputPath);
      await unlink(inputPath);
      await unlink(outputPath);
    } else {
      imageBuffer = Buffer.from(response.data);
    }

    let image = sharp(imageBuffer).ensureAlpha();
    const metadata = await image.metadata();

    const height = metadata.height || 0;
    const width = metadata.width || 0;
    const cropHeight = Math.floor(height * cropPercent);
    const topOffset = height - cropHeight;

    if (height > 0 && width > 0 && cropHeight > 0) {
      image = image.extract({
        left: 0,
        top: topOffset,
        width,
        height: cropHeight,
      });
    }

    const processed = await image.grayscale().toFormat("jpeg").toBuffer();

    return new Uint8Array(processed);
  } catch (err) {
    console.error("❌ Failed to extract image buffer:", err);
    return null;
  }
}
