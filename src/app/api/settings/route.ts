import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { encrypt, decrypt } from "@/lib/encryption";

const SENSITIVE_KEYS = ["smtpPass", "discordWebhook"];

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const settings = await prisma.setting.findMany();
    const config = settings.reduce((acc, s) => {
        let val = s.value;
        if (SENSITIVE_KEYS.includes(s.key)) {
            val = decrypt(val);
        } else if (s.key === "edgeNodes") {
            try {
                const nodes = JSON.parse(val);
                const decryptedNodes = nodes.map((n: any) => ({ ...n, secret: n.secret ? decrypt(n.secret) : n.secret }));
                val = JSON.stringify(decryptedNodes);
            } catch { }
        }
        return { ...acc, [s.key]: val };
    }, {});

    return NextResponse.json(config);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await req.json();

    for (const [key, value] of Object.entries(data)) {
        let valToSave = String(value);

        if (SENSITIVE_KEYS.includes(key) && valToSave) {
            valToSave = encrypt(valToSave);
        } else if (key === "edgeNodes") {
            try {
                const nodes = JSON.parse(valToSave);
                const encryptedNodes = nodes.map((n: any) => ({ ...n, secret: n.secret ? encrypt(n.secret) : n.secret }));
                valToSave = JSON.stringify(encryptedNodes);
            } catch { }
        }

        await prisma.setting.upsert({
            where: { key },
            update: { value: valToSave },
            create: { key, value: valToSave },
        });
    }

    return NextResponse.json({ success: true });
}
