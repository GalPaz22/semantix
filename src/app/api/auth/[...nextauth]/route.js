import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import clientPromise from "/lib/mongodb";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline"
        }
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      }
    }),

    CredentialsProvider({
      name: "Username & Password",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        try {
          const client = await clientPromise;
          const db = client.db("users");

          // Look up by username field
          const user = await db.collection("users").findOne({
            username: credentials.username.trim()
          });

          if (!user || !user.password) {
            console.log("Credentials login: user not found or no password set for", credentials.username);
            return null;
          }

          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) {
            console.log("Credentials login: wrong password for", credentials.username);
            return null;
          }

          console.log("Credentials login: success for", credentials.username);

          // Return the user object — stored in the JWT token
          return {
            id: user._id.toString(),
            name: user.username,
            // Synthetic email so the rest of the app has something to key off
            email: user.email || `${user.username}@internal.semantix`,
            image: null,
            isCredentialsUser: true,
            dbName: user.dbName || user.credentials?.dbName || null,
            onboardingComplete: user.onboardingComplete ?? true,
            tier: user.tier ?? "basic"
          };
        } catch (err) {
          console.error("Credentials authorize error:", err);
          return null;
        }
      }
    }),
  ],

  // MongoDBAdapter is kept for Google OAuth account/user management.
  // Credentials sessions are handled by JWT (no DB session record needed).
  adapter: MongoDBAdapter(clientPromise, {
    collections: {
      Users: "users",
      Accounts: "accounts",
      Sessions: "sessions",
      VerificationTokens: "verification_tokens",
    },
    databaseName: "users"
  }),

  // JWT strategy is required for CredentialsProvider to work.
  // Google OAuth continues to work normally — the adapter still creates/links user records.
  session: {
    strategy: "jwt"
  },

  callbacks: {
    // Only runs for OAuth providers (Google). Credentials go through authorize() directly.
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;
      try {
        const client = await clientPromise;
        const db = client.db("users");

        const existingUser = await db.collection("users").findOne({ email: profile.email });

        if (!existingUser) {
          await db.collection("users").insertOne({
            email: profile.email,
            name: profile.name,
            image: profile.picture,
            emailVerified: new Date(),
            apiKey: `semantix_${new ObjectId()}_${Date.now()}`,
            tier: "basic",
            onboardingComplete: false,
            createdAt: new Date(),
            provider: "google"
          });
          console.log("Created new Google user:", profile.email);
        } else {
          await db.collection("users").updateOne(
            { email: profile.email },
            { $set: { name: profile.name, image: profile.picture, lastLogin: new Date() } }
          );
        }
        return true;
      } catch (error) {
        console.error("SignIn error:", error);
        return false;
      }
    },

    // Populate the JWT token on first sign-in, then pass it through on subsequent requests.
    async jwt({ token, user }) {
      if (user) {
        // First call after sign-in — user object is available
        token.id = user.id;
        token.isCredentialsUser = user.isCredentialsUser || false;

        if (user.isCredentialsUser) {
          // Credentials user — everything is already in the user object from authorize()
          token.onboardingComplete = user.onboardingComplete ?? true;
          token.tier = user.tier ?? "basic";
          token.dbName = user.dbName;
        } else {
          // Google user — fetch their full DB record for onboarding/tier status
          try {
            const client = await clientPromise;
            const db = client.db("users");
            const dbUser = await db.collection("users").findOne({ email: user.email });
            if (dbUser) {
              token.onboardingComplete = dbUser.onboardingComplete ?? false;
              token.tier = dbUser.tier ?? "basic";
              token.dbName = dbUser.dbName || dbUser.credentials?.dbName || null;
            }
          } catch (e) {
            console.error("JWT callback DB lookup error:", e);
          }
        }
      }
      return token;
    },

    // Build the session object from the JWT token (replaces the old DB-session user lookup).
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id || token.sub;
        session.user.onboardingComplete = token.onboardingComplete ?? false;
        session.user.tier = token.tier ?? "basic";
        if (token.isCredentialsUser) {
          session.user.dbName = token.dbName;
        }
      }
      return session;
    },
  },

  events: {
    async signIn(message) { console.log("SignIn event:", message.user?.email); },
    async signOut(message) { console.log("SignOut event:", message); },
    async error(message) { console.error("Auth error:", message); }
  },

  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/login"
  },

  debug: process.env.NODE_ENV === "development"
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
