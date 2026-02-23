import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function SetupLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // If the db is already seeded, the user doesn't belong here
    const userCount = await prisma.user.count();

    if (userCount > 0) {
        redirect("/login");
    }

    return <>{children}</>;
}
