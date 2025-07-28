import { getServerSession } from "next-auth";
import { authOptions }      from "../auth/[...nextauth]/route";
import clientPromise        from "/lib/mongodb";
import fs                   from "fs/promises";
import path                 from "path";
import archiver             from "archiver";
import { Readable }         from "stream";

export async function GET() {
  /* 1. Auth  */
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  /* 2. Pull onboarding credentials */
  const client = await clientPromise;
  const user   = await client
      .db()
      .collection("users")
      .findOne({ email: session.user.email });
      console.log("[plugin]", user?.credentials);

  if (!user?.credentials) {
    console.log()
    return new Response("Onboarding incomplete", { status: 400 });
  }

  const { dbName, categories = [], apiKey = "" } = user.credentials;
  const SEARCH_HOST = "https://shopifyserver-1.onrender.com"

  /* 3. Read template directory into memory & replace placeholders */
  const tmplDir = path.join(process.cwd(), "/templates/plugins/woo");
  const files   = await fs.readdir(tmplDir, { recursive: true });

  // create a zip stream
  const archive = archiver("zip", { zlib: { level: 9 } });
  const stream  = new Readable().wrap(archive);

  files.forEach(async (file) => {
    const abs = path.join(tmplDir, file);
    if ((await fs.stat(abs)).isDirectory()) return;

    let content = await fs.readFile(abs);
    if (file.endsWith(".js") || file.endsWith(".php") || file.endsWith(".json")) {
      content = content
        .toString()
        .replace(/{{DB_NAME}}/g, dbName)
        .replace(/{{API_KEY}}/g, apiKey)
        .replace(/{{SEARCH_HOST}}/g, SEARCH_HOST)
        .replace(/{{CATEGORIES}}/g, JSON.stringify(categories));
    }
    archive.append(content, { name: file });
  });

  archive.finalize();

  /* 4. Stream zip back */
  return new Response(stream, {
    headers: {
      "Content-Type":        "application/zip",
      "Content-Disposition": `attachment; filename="semantix-search-${dbName}.zip"`,
    },
  });
}
