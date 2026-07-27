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

    // ==========================
    // Reply Types
    // ==========================

    if (reply?.type) {

        switch (reply.type) {

            case "text":

                await sock.sendMessage(jid, {
                    text: reply.text,
                    mentions: reply.mentions || []
                });

                return true;

            case "audio":

                await sock.sendMessage(jid, {
                    audio: { url: reply.url },
                    mimetype: reply.mimetype,
                    fileName: reply.fileName,
                    caption: reply.caption
                });

                return true;

            case "video":

                await sock.sendMessage(jid, {
                    video: { url: reply.url },
                    mimetype: reply.mimetype,
                    fileName: reply.fileName,
                    caption: reply.caption
                });

                return true;

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
                        caption: reply.caption || ""
                    });

                    if (reply.contact) {

                        const phone = reply.contact.phone.replace(/\+/g, "");

                        const vcard =
`BEGIN:VCARD
VERSION:3.0
FN:${reply.contact.displayName}
TEL;type=CELL;type=VOICE;waid=${phone}:${reply.contact.phone}
END:VCARD`;

                        await sock.sendMessage(jid, {
                            contacts: {
                                displayName: reply.contact.displayName,
                                contacts: [{
                                    vcard
                                }]
                            }
                        });

                    }

                    return true;

                } catch (err) {

                    console.log(
                        chalk.red("IMAGE ERROR:", err.message)
                    );

                    return false;

                }

            }

            case "group_icon": {

                try {

                    let iconUrl;

                    try {

                        iconUrl = await sock.profilePictureUrl(jid, "image");

                    } catch (err) {

                        iconUrl = null;

                    }

                    if (iconUrl) {

                        await sock.sendMessage(jid, {
                            image: { url: iconUrl },
                            caption: reply.caption || "",
                            mentions: reply.mentions || []
                        });

                    } else {

                        // Group has no icon set — fall back to plain text
                        await sock.sendMessage(jid, {
                            text: reply.caption || "",
                            mentions: reply.mentions || []
                        });

                    }

                    return true;

                } catch (err) {

                    console.log(
                        chalk.red("GROUP ICON ERROR:", err.message)
                    );

                    return false;

                }

            }

            case "document":

                await sock.sendMessage(jid, {
                    document: { url: reply.url },
                    fileName: reply.fileName,
                    mimetype: reply.mimetype
                });

                return true;

            case "sticker":

                await sock.sendMessage(jid, {
                    sticker: { url: reply.url }
                });

                return true;

            default:

                console.log(
                    chalk.yellow(`⚠ Unknown reply type: ${reply.type}`)
                );

                return false;

        }

    }

    // ==========================
    // Actions already handled in index.js
    // ==========================

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

                
