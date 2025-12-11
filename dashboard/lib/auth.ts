import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope: "identify guilds"
        }
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.access_token) {
        (token as any).accessToken = account.access_token;
        (token as any).refreshToken = account.refresh_token;
        (token as any).expiresAt = account.expires_at ? account.expires_at * 1000 : undefined;
      }

      if (profile && "id" in profile) {
        (token as any).userId = (profile as any).id;
      }

      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: (token as any).userId as string | undefined
      };

      // Do not expose accessToken to the client session to avoid leaks
      return session;
    }
  }
};

