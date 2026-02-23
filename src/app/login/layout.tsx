import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const userCount = await prisma.user.count();

    if (userCount === 0) {
        redirect("/setup");
    }

    const session = await getServerSession(authOptions);
    if (session) {
        redirect("/dashboard");
    }

    return <>{children}</>;
}
