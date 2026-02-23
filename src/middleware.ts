import { withAuth } from "next-auth/middleware";

export default withAuth({
    pages: {
        signIn: "/login",
    },
});

export const config = {
    // Only protect the dashboard and its sub-routes.
    // Everything else (status pages, login, api, public) is accessible without auth.
    matcher: ["/dashboard/:path*"],
};
