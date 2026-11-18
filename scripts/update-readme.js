// Rewrites the "Recent Activity" section of README.md with your latest
// public GitHub activity. Runs daily from .github/workflows/daily-update.yml.
const fs = require("fs");

const USER = process.env.GH_USER || "abdulrehman3802";
const START = "<!--ACTIVITY:START-->";
const END = "<!--ACTIVITY:END-->";
const MAX_ITEMS = 5;

const repoLink = (name) => `[${name}](https://github.com/${name})`;

function describe(e) {
  const repo = repoLink(e.repo.name);
  const p = e.payload || {};
  switch (e.type) {
    case "PushEvent":
      return `⬆️ Pushed code to ${repo}`;
    case "CreateEvent":
      return p.ref_type === "repository"
        ? `🎉 Created repository ${repo}`
        : null;
    case "PullRequestEvent":
      if (p.action === "opened") return `🔀 Opened a pull request in ${repo}`;
      if (p.action === "closed" && p.pull_request?.merged)
        return `✅ Merged a pull request in ${repo}`;
      return null;
    case "IssuesEvent":
      return p.action === "opened" ? `🐛 Opened an issue in ${repo}` : null;
    case "ReleaseEvent":
      return `🚀 Published a release in ${repo}`;
    case "ForkEvent":
      return `🍴 Forked ${repo}`;
    case "WatchEvent":
      return `⭐ Starred ${repo}`;
    default:
      return null;
  }
}

async function main() {
  const headers = { "User-Agent": USER, Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN)
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const res = await fetch(
    `https://api.github.com/users/${USER}/events/public?per_page=100`,
    { headers },
  );
  if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
  const events = await res.json();

  const lines = [];
  for (const e of events) {
    // Skip this profile repo itself so the daily update doesn't list itself.
    if (e.repo.name.toLowerCase() === `${USER}/${USER}`.toLowerCase()) continue;
    const text = describe(e);
    if (!text) continue;
    const line = `- ${text} — ${e.created_at.slice(0, 10)}`;
    if (!lines.includes(line)) lines.push(line);
    if (lines.length >= MAX_ITEMS) break;
  }

  const today = new Date().toISOString().slice(0, 10);
  const body = [
    lines.length ? lines.join("\n") : "_No recent public activity._",
    "",
    `<sub>Last updated: ${today}</sub>`,
  ].join("\n");

  const readme = fs.readFileSync("README.md", "utf8");
  const s = readme.indexOf(START);
  const t = readme.indexOf(END);
  if (s === -1 || t === -1)
    throw new Error("Activity markers not found in README.md");

  const updated = `${readme.slice(0, s + START.length)}\n${body}\n${readme.slice(t)}`;
  fs.writeFileSync("README.md", updated);
  console.log(updated === readme ? "No changes." : "README updated.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
