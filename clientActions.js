import chalk from "chalk";
import fs from "fs";
import path from "path";

export async function executeClientAction({
    action,
    reply,
    sock,
    jid,
    msg,
    sender
}) {

    if (!reply?.type) {

        switch (action) {

            case "recover_view_once":
            case "kick":
            case "add":
            case "promote":
            case "demote":
                return true;

            default:
                return false;

        }

    }

    switch (reply.type) {

        // ==========================
        // TEXT
        // ==========================

        case "text": {

            await sock.sendMessage(jid, {
                text: reply.text,
                mentions: reply.mentions || []
            });

            return true;

        }

        // ==========================
        // PREMIUM DOWNLOAD
        // ==========================

        case "download": {

            try {

                // Processing
                await sock.sendMessage(jid, {
                    react: {
                        text: "⏳",
                        key: msg.key
                    }
                });

                // Thumbnail Card
                if (reply.thumbnail) {

                    await sock.sendMessage(jid, {

                        image: {
                            url: reply.thumbnail
                        },

                        caption:
`╭━━━〔 📥 Kenya-Ultra Downloader 〕━━━⬣

🎵 *Title*
${reply.title}

━━━━━━━━━━━━━━

🌐 Source : ${reply.source}
📦 Size : ${reply.size}
⏱ Duration : ${reply.duration}

━━━━━━━━━━━━━━

⬇ Downloading...

⚡ Kenya-Ultra`

                    });

                }

                await sock.sendMessage(jid, {

                    react: {
                        text: "⬇️",
                        key: msg.key
                    }

                });

                // AUDIO
                if (reply.mediaType === "audio") {

                    await sock.sendMessage(jid, {

                        audio: {
                            url: reply.url
                        },

                        mimetype:
                            reply.mimetype ||

                            "audio/mpeg",

                        fileName:
                            reply.fileName,

                        ptt: false

                    });

                }

                // VIDEO
                else {

                    await sock.sendMessage(jid, {

                        video: {
                            url: reply.url
                        },

                        mimetype:
                            reply.mimetype ||

                            "video/mp4",

                        fileName:
                            reply.fileName,

                        caption:
                            `🎬 ${reply.title}`

                    });

                }

                await sock.sendMessage(jid, {

                    react: {
                        text: "✅",
                        key: msg.key
                    }

                });

                return true;

            }

            catch (err) {

                console.log(
                    chalk.red(
                        "DOWNLOAD ERROR:",
                        err.message
                    )
                );

                await sock.sendMessage(jid, {

                    react: {
                        text: "❌",
                        key: msg.key
                    }

                });

                return false;

            }

        }

        // ==========================
        // AUDIO
        // ==========================

        case "audio": {

            await sock.sendMessage(jid, {

                audio: {
                    url: reply.url
                },

                mimetype:
                    reply.mimetype,

                fileName:
                    reply.fileName,

                caption:
                    reply.caption

            });

            return true;

        }

        // ==========================
        // VIDEO
        // ==========================

        case "video": {

            await sock.sendMessage(jid, {

                video: {
                    url: reply.url
                },

                mimetype:
                    reply.mimetype,

                fileName:
                    reply.fileName,

                caption:
                    reply.caption

            });

            return true;

                        }
                   // ==========================
        // IMAGE
        // ==========================

        case "image": {

            try {

                let image;

                if (reply.file) {

                    const imagePath = path.join(
                        process.cwd(),
                        "assets",
                        "images",
                        reply.file
                    );

                    image = fs.readFileSync(imagePath);

                } else {

                    image = {
                        url: reply.url
                    };

                }

                await sock.sendMessage(jid, {

                    image,

                    caption: reply.caption || "",

                    mentions: reply.mentions || []

                });

                if (reply.contact) {

                    const phone =
                        reply.contact.phone.replace(/\+/g, "");

                    const vcard =
`BEGIN:VCARD
VERSION:3.0
FN:${reply.contact.displayName}
TEL;type=CELL;type=VOICE;waid=${phone}:${reply.contact.phone}
END:VCARD`;

                    await sock.sendMessage(jid, {

                        contacts: {

                            displayName:
                                reply.contact.displayName,

                            contacts: [
                                {
                                    vcard
                                }
                            ]

                        }

                    });

                }

                return true;

            }

            catch (err) {

                console.log(
                    chalk.red(
                        "IMAGE ERROR:",
                        err.message
                    )
                );

                return false;

            }

        }

        // ==========================
        // GROUP ICON
        // ==========================

        case "group_icon": {

            try {

                let iconUrl;

                try {

                    iconUrl =
                        await sock.profilePictureUrl(
                            jid,
                            "image"
                        );

                }

                catch {

                    iconUrl = null;

                }

                if (iconUrl) {

                    await sock.sendMessage(jid, {

                        image: {
                            url: iconUrl
                        },

                        caption:
                            reply.caption || "",

                        mentions:
                            reply.mentions || []

                    });

                }

                else {

                    await sock.sendMessage(jid, {

                        text:
                            reply.caption || "",

                        mentions:
                            reply.mentions || []

                    });

                }

                return true;

            }

            catch (err) {

                console.log(
                    chalk.red(
                        "GROUP ICON ERROR:",
                        err.message
                    )
                );

                return false;

            }

        }

        // ==========================
        // DOCUMENT
        // ==========================

        case "document": {

            await sock.sendMessage(jid, {

                document: {
                    url: reply.url
                },

                fileName:
                    reply.fileName,

                mimetype:
                    reply.mimetype

            });

            return true;

        }

        // ==========================
        // STICKER
        // ==========================

        case "sticker": {

            await sock.sendMessage(jid, {

                sticker: {
                    url: reply.url
                }

            });

            return true;

        }

        default:

            console.log(
                chalk.yellow(
                    `⚠ Unknown reply type: ${reply.type}`
                )
            );

            return false;

    }

                        } 
