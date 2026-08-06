import { Sticker, StickerTypes } from "wa-sticker-formatter";
import webpmux from "node-webpmux";

const { Image } = webpmux;

/**
 * Converts a raw image/video/gif buffer into a WhatsApp-ready sticker
 * webp buffer, tagged with the given pack/author. Handles the
 * image->webp and video/gif->animated-webp encoding itself (via
 * sharp + ffmpeg under the hood) — this is the "create a brand new
 * sticker from media" path, used by .sticker.
 */
export async function createSticker(buffer, { packname, author }) {

    const sticker = new Sticker(buffer, {
        pack: packname || "Kenya-Ultra",
        author: author || "Kenya-Ultra Bot",
        type: StickerTypes.FULL,
        categories: ["🐺"],
        quality: 70
    });

    return await sticker.toBuffer();

}

/**
 * Re-tags an EXISTING sticker webp with a new pack/author, without
 * touching the actual image/animation data at all — just rewrites
 * the EXIF chunk. Used by .take, so animated stickers stay animated
 * instead of getting flattened by a full re-encode.
 */
export async function retagSticker(webpBuffer, { packname, author }) {

    const img = new Image();

    await img.load(webpBuffer);

    const json = {
        "sticker-pack-id": `kenya-ultra-${Date.now()}`,
        "sticker-pack-name": packname || "Kenya-Ultra",
        "sticker-pack-publisher": author || "Kenya-Ultra Bot",
        emojis: ["🐺"]
    };

    // Standard WhatsApp sticker EXIF header — fixed TIFF-style prefix
    // bytes, followed by the JSON metadata WhatsApp reads for the
    // pack name/author shown under the sticker.
    const exifAttr = Buffer.from([
        0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
        0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00
    ]);

    const jsonBuffer = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuffer]);
    exif.writeUIntLE(jsonBuffer.length, 14, 4);

    img.exif = exif;

    return await img.save(null);

}
