import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import { ObjectId } from "mongodb";
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
          image: profile.picture
        };
      }
    })
  ],
  adapter: MongoDBAdapter(clientPromise, {
    collections: {
      Users: "users",
      Accounts: "accounts",
      Sessions: "sessions",
      VerificationTokens: "verification_tokens"
    },
    databaseName: "users"
  }),
  session: {
    strategy: "database"
  },
  callbacks: {
    async signIn({ profile }) {
      try {
        const client = await clientPromise;
        const db = client.db("users");
        const existingUser = await db.collection("users").findOne({
          email: profile.email
        });

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
        } else {
          await db.collection("users").updateOne(
            { email: profile.email },
            {
              $set: {
                name: profile.name,
                image: profile.picture,
                lastLogin: new Date()
              }
            }
          );
        }
        return true;
      } catch (error) {
        console.error("SignIn error:", error);
        return false;
      }
    },
    async session({ session }) {
      try {
        if (session?.user?.email) {
          const client = await clientPromise;
          const db = client.db("users");
          const dbUser = await db.collection("users").findOne({
            email: session.user.email
          });

          if (dbUser) {
            const dbName =
              dbUser?.onboarding?.credentials?.dbName ||
              dbUser?.credentials?.dbName ||
              dbUser?.onboarding?.dbName ||
              dbUser?.dbName ||
              "";

            session.user.id = dbUser._id.toString();
            session.user.onboardingComplete = dbUser.onboardingComplete ?? false;
            session.user.tier = dbUser.tier ?? "basic";
            session.user.dbName = dbName;
          }
        }
        return session;
      } catch (error) {
        console.error("Session error:", error);
        return session;
      }
    }
  },
  events: {
    async signIn(message) {
      console.log("SignIn event:", message);
    },
    async signOut(message) {
      console.log("SignOut event:", message);
    },
    async error(message) {
      console.error("Auth error:", message);
    }
  },
  pages: {
    signIn: "/",
    signOut: "/",
    error: "/"
  },
  debug: true
};
