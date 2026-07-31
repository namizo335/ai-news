import { resolve } from "node:path";
import { loadKeywordsConfig, loadSourcesConfig, getProjectRoot } from "./config.js";
import {
  dedupeArticles,
  excludeSent,
  filterByAge,
  selectAlerts,
  selectDigest,
} from "./filter.js";
import { formatAlert, formatDigest } from "./format.js";
import { postToSlack } from "./slack.js";
import { fetchAllSources } from "./sources/index.js";
import { loadSentIds, markSent, saveSentIds } from "./state.js";
import type { CliOptions, Mode } from "./types.js";

function parseArgs(argv: string[]): CliOptions {
  let mode: Mode = "digest";
  let dryRun = false;
  let statePath = process.env.STATE_PATH?.trim() || resolve(getProjectRoot(), "sent.json");

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--mode") {
      const value = argv[++i];
      if (value !== "digest" && value !== "alert") {
        throw new Error(`Invalid --mode: ${value}`);
      }
      mode = value;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--state") {
      const value = argv[++i];
      if (!value) throw new Error("--state requires a path");
      statePath = resolve(value);
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return { mode, dryRun, statePath };
}

function printHelp(): void {
  console.log(`Usage: npm start -- --mode digest|alert [--dry-run] [--state path]

Options:
  --mode digest|alert   digest = morning digest, alert = important news
  --dry-run             print message without posting to Slack
  --state <path>        path to sent.json (default: ./sent.json)
`);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const sourcesConfig = loadSourcesConfig();
  const keywordsConfig = loadKeywordsConfig();
  const allSources = [...sourcesConfig.japanese, ...sourcesConfig.english];
  const limits = sourcesConfig.limits;

  console.error(`mode=${options.mode} dryRun=${options.dryRun} state=${options.statePath}`);

  const { articles: raw, errors } = await fetchAllSources(allSources, limits);
  const maxAge =
    options.mode === "digest" ? limits.maxAgeHoursDigest : limits.maxAgeHoursAlert;

  let articles = dedupeArticles(raw);
  articles = filterByAge(articles, maxAge);

  const sent = loadSentIds(options.statePath);
  articles = excludeSent(articles, sent);

  let text: string;
  let postedIds: string[] = [];

  if (options.mode === "digest") {
    const { japanese, english } = selectDigest(articles, limits);
    text = formatDigest(japanese, english);
    postedIds = [...japanese, ...english].map((a) => a.id);
  } else {
    const alerts = selectAlerts(articles, keywordsConfig.immediate);
    if (alerts.length === 0) {
      console.error("No alert candidates. Exiting without Slack post.");
      if (errors.length > 0) {
        console.error(`Source errors: ${errors.join("; ")}`);
      }
      return;
    }
    text = formatAlert(alerts);
    postedIds = alerts.map((a) => a.id);
  }

  console.log(text);

  if (!options.dryRun) {
    const webhook = process.env.SLACK_WEBHOOK_URL?.trim();
    if (!webhook) {
      throw new Error("SLACK_WEBHOOK_URL is required unless --dry-run is set");
    }
    await postToSlack(webhook, text);
    console.error("Posted to Slack.");
  } else {
    console.error("(dry-run: Slack post skipped)");
  }

  // Persist sent IDs even on dry-run only when explicitly posting,
  // so dry-run stays non-destructive.
  if (!options.dryRun && postedIds.length > 0) {
    const next = markSent(sent, postedIds);
    saveSentIds(options.statePath, next, limits.sentRetention);
    console.error(`Saved ${postedIds.length} urls to state (${next.size} total).`);
  }

  if (errors.length > 0) {
    console.error(`Completed with ${errors.length} source error(s).`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
