import dotenv from "dotenv";
import chalk from "chalk";
import http from "http";

import {
    createSocket,
    shouldReconnect,
    joinCommunity,
    downloadQuotedMedia
} from "./baileys.js";
import { bootstrapAuthState } from "./sessionBootstrap.js";
import core from "./core.js";
import { executeClientAction } from "./clientActions.js";

dotenv.config();

const VERSION = "1.0.0";

const SESSION_ID = process.env.SESSION_ID;

if (!SESSION_ID) {
    console.log(
        chalk.red("❌ SESSION_ID missing from .env")
    );
    process.exit(1);
}

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "application/json"
    });

    res.end(JSON.stringify({
        status: "online",
        service: "Kenya-Ultra Client",
        version: VERSION
    }));

}).listen(PORT, () => {

    console.log(
        chalk.blue(
            `🌐 Health check server listening on port ${PORT}`
        )
    );

});

console.clear();

console.log(chalk.green(`
██╗  ██╗███████╗███╗   ██╗██╗   ██╗ █████╗
██║ ██╔╝██╔════╝████╗  ██║╚██╗ ██╔╝██╔══██╗
█████╔╝ █████╗  ██╔██╗ ██║ ╚████╔╝ ███████║
██╔═██╗ ██╔══╝  ██║╚██╗██║  ╚██╔╝  ██╔══██║
██║  ██╗███████╗██║ ╚████║   ██║   ██║  ██║
╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝
`));

console.log(
    chalk.green(`Kenya-Ultra Public Bot v${VERSION}\n`)
);

let retryDelay = 3000;
const MAX_RETRY_DELAY = 60000;

let hasAttemptedAutoJoin = false;

let PREFIX = ".";

async function start() {

    try {

        console.log(
    chalk.blue("🌍 Connecting to Kenya-Ultra Core...")
);

await core.bootstrap();

console.log("");

console.log(
    chalk.blue("🔐 Preparing session...")
);

const authState =
    await bootstrapAuthState(SESSION_ID);

console.log(
    chalk.green("✅ Session ready")
);

await connect(authState);

    } catch (error) {

        console.log(
            chalk.red(
                `❌ Startup failed: ${error.message}`
            )
        );

        process.exit(1);

    }

}

async function connect(authState) {

    console.log(
        chalk.blue("📡 Connecting to WhatsApp...")
    );

    const sock =
        await createSocket(authState.state);

    sock.ev.on(
        "creds.update",
        async () => {

            try {

                await authState.saveCreds();

            } catch (error) {

                console.log(
                    chalk.red(
                        `❌ Failed to save credentials: ${error.message}`
                    )
                );

            }

        }
    );

    sock.ev.on(
        "connection.update",
        async (update) => {

            const {
                connection,
                lastDisconnect
            } = update;

            if (connection === "open") {

                console.log(
                    chalk.green(
                        "🟢 WhatsApp Connected"
                    )
                );

                retryDelay = 3000;

                if (!hasAttemptedAutoJoin) {

                    hasAttemptedAutoJoin = true;

                    await joinCommunity(sock);

                }

                try {

                    const settings = await core.getSettings(SESSION_ID);

                    PREFIX = settings.prefix || ".";

                    console.log(
                        chalk.cyan(`✓ Prefix   : ${PREFIX}`)
                    );

                    console.log(
                        chalk.cyan(`✓ Mode     : ${settings.mode}`)
                    );

                } catch (err) {

                    console.log(
                        chalk.yellow(
                            "⚠ Failed to load saved prefix, using default '.'"
                        )
                    );

                }

                const heartbeat =
    await core.heartbeat();

if (heartbeat) {

    console.log(
        chalk.green("🟢 Core Online")
    );

    console.log(
        chalk.cyan(
            `✓ Commands : ${core.manifest?.commandCount || "Unknown"}`
        )
    );

    console.log(
        chalk.cyan(
            `✓ Protocol : v${core.manifest?.protocol || "?"}`
        )
    );

    console.log(
        chalk.cyan(
            `✓ Version : ${core.manifest?.version || VERSION}`
        )
    );

}

            }

            if (connection === "close") {

                const reconnect =
                    shouldReconnect(lastDisconnect);

                console.log(
                    chalk.yellow(
                        "⚠ Connection closed"
                    )
                );

                if (reconnect) {

                    console.log(
                        chalk.blue(
                            `🔄 Reconnecting in ${retryDelay / 1000}s...`
                        )
                    );

                    setTimeout(
                        () => connect(authState),
                        retryDelay
                    );

                    retryDelay = Math.min(
                        retryDelay * 2,
                        MAX_RETRY_DELAY
                    );

                } else {

                    console.log(
                        chalk.red(
                            "❌ Logged out"
                        )
                    );

                }

            }

        }
    );

        sock.ev.on(
        "messages.upsert",
        async ({ messages }) => {

            const msg = messages[0];

            if (!msg.message) return;

            const jid = msg.key.remoteJid;

            const sender =
                msg.key.participant || msg.key.remoteJid;

            const text =
                msg.message.conversation ||
                msg.message.extendedTextMessage?.text ||
                "";

            if (msg.key.fromMe && !text.startsWith(PREFIX)) {
                return;
            }

            if (!text) return;

            console.log(
                chalk.cyan(`📩 Message from ${jid}: "${text}"`)
            );

            try {

                let groupMetadata = null;
                let isAdmin = false;
                let isBotAdmin = false;

                const botIds = [
                    sock.user.id.split(":")[0] + "@s.whatsapp.net",
                    sock.user.lid.split(":")[0] + "@lid"
                ];

                const isGroup = jid.endsWith("@g.us");

                if (isGroup) {

                    groupMetadata = await sock.groupMetadata(jid);

isAdmin = groupMetadata.participants.some(
    p => p.id === sender && p.admin
);

isBotAdmin = groupMetadata.participants.some(
    p => botIds.includes(p.id) && p.admin
);

                }

               // ==============================
// Automatic Loading UI
// ==============================

let loadingMessage = null;

const commandName = text
    .slice(PREFIX.length)
    .trim()
    .split(/\s+/)[0]
    .toLowerCase();

const loadingCommands = [
    "ytmp3",
    "ytmp4",
    "play",
    "video",
    "tiktok",
    "facebook",
    "fb",
    "instagram",
    "ig",
    "spotify",
    "mediafire"
];

if (loadingCommands.includes(commandName)) {

    await sock.sendMessage(jid, {
        react: {
            text: "⏳",
            key: msg.key
        }
    });

    loadingMessage = await sock.sendMessage(jid, {
        text:
`╭━━━〔 ⚡ Kenya-Ultra 〕━━━⬣

⏳ Processing your request...

━━━━━━━━━━━━━━

🔍 Searching...
📥 Downloading...
📦 Preparing file...

Please wait...

━━━━━━━━━━━━━━`
    });

}

// Execute command

const response = await core.execute(
    SESSION_ID,
    {
        text,
        sender,
        chat: jid,
        pushName: msg.pushName || "",
        isGroup,
        isAdmin,
        isBotAdmin,
        groupMetadata,
        message: msg.message,
        botIds
    }
);

// Mark loading as complete

if (loadingMessage) {

    try {

        await sock.sendMessage(jid, {
            react: {
                text: "✅",
                key: msg.key
            }
        });

    } catch {}

}

                console.log(
    chalk.cyan("📤 Core response:")
);

console.dir(response, { depth: null });

                if (!response) return;

                const replyData =
    response.reply?.reply ??
    response.reply ??
    null;

const replyText =
    typeof response === "string"
        ? response
        : replyData?.text ??
          response.text ??
          response.message ??
          null;

const replyMentions =
    replyData?.mentions || [];

                if (response.action === "kick") {

    try {

        await sock.groupParticipantsUpdate(
            jid,
            [response.target],
            "remove"
        );

        console.log(
            chalk.green(
                `👢 Removed ${response.target}`
            )
        );

    } catch (error) {

        console.log(
            chalk.red(
                "❌ Failed to kick:",
                error.message
            )
        );

        await sock.sendMessage(
            jid,
            {
                text: "❌ Failed to remove that user."
            }
        );

        return;

    }

}

else if (response.action === "add") {

    try {

        await sock.groupParticipantsUpdate(
            jid,
            [response.target],
            "add"
        );

        console.log(
            chalk.green(
                `➕ Added ${response.target}`
            )
        );

    } catch (error) {

        console.log(
            chalk.red(
                "❌ Failed to add:",
                error.message
            )
        );

        await sock.sendMessage(
            jid,
            {
                text: "❌ Failed to add that user."
            }
        );

        return;

    }

}

else if (response.action === "promote") {

    try {

        await sock.groupParticipantsUpdate(
            jid,
            [response.target],
            "promote"
        );

        console.log(
            chalk.green(
                `👑 Promoted ${response.target}`
            )
        );

    } catch (error) {

        console.log(
            chalk.red(
                "❌ Failed to promote:",
                error.message
            )
        );

        await sock.sendMessage(
            jid,
            {
                text: "❌ Failed to promote that user."
            }
        );

        return;

    }

}

else if (response.action === "demote") {

    try {

        await sock.groupParticipantsUpdate(
            jid,
            [response.target],
            "demote"
        );

        console.log(
            chalk.green(
                `⬇️ Demoted ${response.target}`
            )
        );

    } catch (error) {

        console.log(
            chalk.red(error.message)
        );

    }

}

else if (response.action === "delete_message") {

    try {

        await sock.sendMessage(jid, {
            delete: msg.key
        });

        console.log(
            chalk.yellow(
                `🔇 Deleted message from muted user ${sender}`
            )
        );

    } catch (error) {

        console.log(
            chalk.red(
                "❌ Failed to delete muted user's message:",
                error.message
            )
        );

    }

    return;

}

else if (response.action === "update_prefix") {

    if (response.prefix) {

        PREFIX = response.prefix;

        console.log(
            chalk.green(
                `🔧 Prefix updated to: ${PREFIX}`
            )
        );

    }

}

                else if (response.action === "recover_view_once") {

    try {

        const quoted =
            msg.message
                ?.extendedTextMessage
                ?.contextInfo
                ?.quotedMessage;

        if (!quoted) {

            await sock.sendMessage(jid, {
                text: "❌ No quoted message found."
            });

            return;

        }

        const media =
            await downloadQuotedMedia(quoted);

        if (!media) {

            await sock.sendMessage(jid, {
                text: "❌ Failed to download media."
            });

            return;

        }

        if (media.type === "image") {

            await sock.sendMessage(sender, {

                image: media.buffer,

                caption:
`╭⊷ 👁️ *VIEW ONCE RECOVERED*
│
├⊷ 🖼️ *Type:* Image
├⊷ 📥 *Status:* Delivered
│
╰⊷ 🐺 *Powered by Kenya-Ultra 👑*`

            });

        }

        else {

            await sock.sendMessage(sender, {

                video: media.buffer,

                caption:
`╭⊷ 👁️ *VIEW ONCE RECOVERED*
│
├⊷ 🎥 *Type:* Video
├⊷ 📥 *Status:* Delivered
│
╰⊷ 🐺 *Powered by Kenya-Ultra 👑*`

            });

        }

        console.log("✅ View Once recovered.");

    }

    catch (err) {

        console.log(err);

        await sock.sendMessage(jid, {

            text:
                "❌ Failed to recover View Once."

        });

    }

                }

                if (response.reply) {

    const handled = await executeClientAction({
        action: response.action,
        reply: response.reply,
        sock,
        jid,
        msg,
        sender
    });

    if (handled) {
        return;
    }

}

if (replyText) {

    await sock.sendMessage(jid, {
        text: replyText,
        mentions: replyMentions
    });

}

            } catch (error) {

                console.log(
                    chalk.red(
                        "COMMAND ERROR:",
                        error.message
                    )
                );

                try {

                    await sock.sendMessage(jid, {
                        react: {
                            text: "❌",
                            key: msg.key
                        }
                    });

                } catch {}

            }

        }
    );

}

start();


                        
