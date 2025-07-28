import fs from "fs/promises";
import path from "path";
import archiver from "archiver";
import { PassThrough } from "stream";

async function walkDir(dir, base = dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...await walkDir(full, base));
    } else {
      out.push(path.relative(base, full));
    }
  }
  return out;
}

export async function GET() {
  const tplDir = path.join(process.cwd(), "templates/plugins/woo");
  const files  = await walkDir(tplDir);

  const zipStream = new PassThrough();
  const archive   = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", err => { throw err });
  archive.pipe(zipStream);

  for (const rel of files) {
    archive.file(path.join(tplDir, rel), { name: rel });
  }
  await archive.finalize();

  return new Response(zipStream, {
    status: 200,
    headers: {
      "Content-Type":        "application/zip",
      "Content-Disposition": `attachment; filename="semantix-plugin.zip"`
    }
  });
}
