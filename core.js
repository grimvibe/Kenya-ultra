import axios from "axios";

const CORE_URL =
    process.env.CORE_URL ||
    "http://kenya-ultra-panel.duckdns.org:3001";

class KenyaUltraCore {

    constructor() {
        this.manifest = null;
        this.protocol = null;
    }

    async validate(sessionId) {

        try {

            const { data } = await axios.post(
                `${CORE_URL}/validate`,
                {
                    sessionId
                }
            );

            return {
                success: data.success,
                client: data.client,
                auth: data.auth
            };

        } catch (error) {

            throw new Error(
                error.response?.data?.message ||
                "Failed to validate SESSION_ID."
            );

        }

    }

    async execute(sessionId, message) {

        try {

            const { data } = await axios.post(
                `${CORE_URL}/execute`,
                {
                    sessionId,
                    message
                }
            );

            return data;

        } catch (error) {

            console.log("========== CORE ERROR ==========");
            console.dir(error.response?.data || error, {
                depth: null
            });
            console.log("================================");

            throw new Error(
                error.response?.data?.message ||
                error.message ||
                "Failed to execute command."
            );

        }

    }

    async heartbeat() {

        try {

            const { data } = await axios.get(CORE_URL);

            return data;

        } catch {

            return null;

        }

    }

    async getVersion() {

        try {

            const { data } = await axios.get(`${CORE_URL}/version`);

            return data;

        } catch {

            return {
                success: false
            };

        }

    }

    async handshake() {

        const { data } =
            await axios.get(`${CORE_URL}/handshake`);

        this.protocol = data.protocol;

        return data;

    }

    async getManifest() {

        const { data } =
            await axios.get(`${CORE_URL}/manifest`);

        this.manifest = data;

        return data;

    }

    async getHealth() {

        const { data } =
            await axios.get(`${CORE_URL}/health`);

        return data;

    }

    async downloadCommands() {

        return `${CORE_URL}/commands/download`;

    }

    async bootstrap() {

        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("Connecting to Kenya-Ultra Core...");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        await this.handshake();

        const manifest =
            await this.getManifest();

        const health =
            await this.getHealth();

        console.log("✓ Handshake Complete");
        console.log(`✓ Protocol : v${manifest.protocol}`);
        console.log(`✓ Version  : ${manifest.version}`);
        console.log(`✓ Commands : ${manifest.commandCount}`);
        console.log(`✓ Runtime  : ${manifest.runtime}`);
        console.log(`✓ Status   : ${health.status}`);

        return {
            manifest,
            health
        };

    }

}

export default new KenyaUltraCore();
