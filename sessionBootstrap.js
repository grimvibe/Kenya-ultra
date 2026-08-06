import fs from "fs";
import path from "path";
import { useMultiFileAuthState, BufferJSON } from "baileys";
import core from "./core.js";

const AUTH_FOLDER = path.join(process.cwd(), "auth_info");

function validateCredentials(creds) {
    /**
     * Validates that all required credential fields are present
     * Helps diagnose authentication issues early
     */
    const requiredFields = [
        'registrationId',
        'signedIdentityKey',
        'signedPreKey',
        'advSecretKey',
        'noiseKey',
        'pairingEphemeralKeyPair'
    ];

    const missingFields = requiredFields.filter(field => !creds[field]);

    if (missingFields.length > 0) {
        console.warn(`⚠️ Missing credential fields: ${missingFields.join(', ')}`);
        return false;
    }

    return true;
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

        // authRaw is the whole { creds, keys } payload, serialized on
        // Core's side with BufferJSON.replacer and never touched by
        // plain JSON.stringify/parse in between (Express and axios
        // both bypass BufferJSON, which silently corrupts the buffer
        // encoding — see api/validate.js on Core for the full
        // explanation). Parsing this string directly with
        // BufferJSON.reviver is the only path that reconstructs real,
        // usable Buffers.
        if (!validation.authRaw) {

            throw new Error(
                "Core did not return authRaw — update Core to the version that includes it in /validate."
            );

        }

        const restoredAuth = JSON.parse(
            validation.authRaw,
            BufferJSON.reviver
        );

        // Restore credentials
        const restoredCreds = restoredAuth.creds || {};
        
        // ✅ FIX: Validate credentials before assigning
        if (!validateCredentials(restoredCreds)) {
            throw new Error(
                "Core returned incomplete credentials. Some required fields are missing."
            );
        }

        Object.assign(state.creds, restoredCreds);

        // Restore signal keys safely
        if (
            restoredAuth.keys &&
            typeof restoredAuth.keys === "object"
        ) {

            const restored = restoredAuth.keys;

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
