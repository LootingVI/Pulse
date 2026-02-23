import crypto from "crypto";

// Use NEXTAUTH_SECRET as the encryption key. It should be at least 32 characters in production.
const getEncryptionKey = () => {
    const secret = process.env.NEXTAUTH_SECRET || "default_fallback_secret_for_pulse_dev123";
    return crypto.createHash("sha256").update(String(secret)).digest("base64").substr(0, 32);
};

const IV_LENGTH = 16;
const ALGORITHM = "aes-256-gcm";

export function encrypt(text: string): string {
    if (!text) return text;
    // Don't double encrypt
    if (text.startsWith("enc:")) return text;

    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(getEncryptionKey()), iv);
        let encrypted = cipher.update(text, "utf8", "hex");
        encrypted += cipher.final("hex");
        const authTag = cipher.getAuthTag().toString("hex");
        return `enc:${iv.toString("hex")}:${authTag}:${encrypted}`;
    } catch {
        return text;
    }
}

export function decrypt(text: string): string {
    if (!text) return text;
    if (!text.startsWith("enc:")) return text;

    try {
        const parts = text.split(":");
        const iv = Buffer.from(parts[1], "hex");
        const authTag = Buffer.from(parts[2], "hex");
        const encryptedText = Buffer.from(parts[3], "hex");

        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(getEncryptionKey()), iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedText, undefined, "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
    } catch (e) {
        console.error("Decryption failed", e);
        return "";
    }
}
