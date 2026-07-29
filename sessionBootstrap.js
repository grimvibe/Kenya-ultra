import fs from "fs";
import path from "path";
import { useMultiFileAuthState, BufferJSON } from "baileys";
import core from "./core.js";

const AUTH_FOLDER = path.join(process.cwd(), "auth_info");

function restoreBuffers(value) {

    if (!value) return value;

    return JSON.parse(
        JSON.stringify(value),
        BufferJSON.reviver
    );

}

export async function bootstrapAuthState(sessionId) {

    const credsPath =
        path.join(AUTH_FOLDER, "creds.json");

    const alreadyLinked =
        fs.existsSync(credsPath);

    fs.mkdirSync(
        AUTH_FOLDER,
        { recursive: true }
    );

    const {
        state,
        saveCreds
    } = await useMultiFileAuthState(AUTH_FOLDER);

    if (!alreadyLinked) {

        console.log(
            "📥 Fetching session from Kenya-Ultra Core..."
        );

        const validation =
            await core.validate(sessionId);

        if (!validation.success) {

            throw new Error(
                validation.message ||
                "Invalid SESSION_ID."
            );

        }

        if (!validation.auth?.creds) {

            throw new Error(
                "Core returned invalid auth data."
            );

        }

        // Restore credentials
        Object.assign(
            state.creds,
            restoreBuffers(validation.auth.creds)
        );

        // Restore signal keys safely
        if (
            validation.auth.keys &&
            typeof validation.auth.keys === "object"
        ) {

            const restored =
                restoreBuffers(validation.auth.keys);

            for (const category of Object.keys(restored)) {

                if (
                    restored[category] &&
                    typeof restored[category] === "object"
                ) {

                    await state.keys.set({
                        [category]: restored[category]
                    });

                }

            }

        }

        await saveCreds();

        console.log(
            "✅ Session restored successfully."
        );

    } else {

        console.log(
            "📂 Using existing auth_info session."
        );

    }

    return {
        state,
        saveCreds
    };

}
