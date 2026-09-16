import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id    = user.id;
        token.name  = user.name;
        token.roles = user.roles;
      }
      if (trigger === "update" && token.id) {
        const fresh = await db.user.findUnique({
          where:  { id: token.id as string },
          select: { roles: true },
        });
        if (fresh) token.roles = fresh.roles;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id   = token.id as string;
        session.user.name = token.name as string;
        const fresh = token.id
          ? await db.user.findUnique({ where: { id: token.id as string }, select: { roles: true } })
          : null;
        session.user.roles = fresh?.roles ?? (token.roles as string[]) ?? ["trainee"];
      }
      return session;
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email    = credentials?.email    as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, roles: user.roles };
      },
    }),
  ],
});