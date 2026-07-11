import { config } from "dotenv";
config({ path: ".env.local" });
config();

async function main() {
  // Imported after dotenv so env vars are set before module init.
  const { runPipeline } = await import("../src/lib/pipeline/run");
  const result = await runPipeline();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
