import { unlink } from "fs/promises";

export async function cleanUpTempFiles(...filePaths: string[]) {
  for (const file of filePaths) {
    try {
      await unlink(file);
      console.log(`🧹 Deleted temp file: ${file}`);
    } catch (err) {
      console.warn(`⚠️ Failed to delete temp file: ${file}`, err);
    }
  }
}
