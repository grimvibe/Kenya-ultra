import chalk from "chalk";

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
                    audio: {
                        url: reply.url
                    },
                    mimetype: reply.mimetype,
                    fileName: reply.fileName,
                    caption: reply.caption
                });

                return true;

            case "video":

                await sock.sendMessage(jid, {
                    video: {
                        url: reply.url
                    },
                    mimetype: reply.mimetype,
                    fileName: reply.fileName,
                    caption: reply.caption
                });

                return true;

            case "image":

                await sock.sendMessage(jid, {
                    image: {
                        url: reply.url
                    },
                    caption: reply.caption
                });

                return true;

            case "document":

                await sock.sendMessage(jid, {
                    document: {
                        url: reply.url
                    },
                    fileName: reply.fileName,
                    mimetype: reply.mimetype
                });

                return true;

            case "sticker":

                await sock.sendMessage(jid, {
                    sticker: {
                        url: reply.url
                    }
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
    // Existing Client Actions
    // ==========================

    switch (action) {

        case "recover_view_once":
            break;

        case "kick":
            break;

        case "promote":
            break;

        default:
            return false;

    }

    return true;

}
