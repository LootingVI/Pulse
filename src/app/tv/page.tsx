import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import TvClient from "./tv-client";

export default async function TvPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    return <TvClient />;
}
