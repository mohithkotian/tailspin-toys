import { createServer } from "node:http";
import { createCanvas, joinSession } from "@github/copilot-sdk/extension";

const issues = [
    {
        number: 6,
        title: "Implement pagination on the game list page",
        body: "Loading the entire catalog on one page will hurt performance as the number of games grows. Add paginated data-access helpers, accessible controls, and unit and end-to-end coverage.",
        url: "https://github.com/mohithkotian/tailspin-toys/issues/6",
        priority: "High",
        justification: "This is the broadest performance risk and touches the data layer, UI, accessibility, and both test suites. It is also likely to become more expensive as the catalog grows.",
    },
    {
        number: 1,
        title: "Add a search box to find games by title",
        body: "Add a case-insensitive title search with an accessible input, a no-results state, and unit and end-to-end test coverage.",
        url: "https://github.com/mohithkotian/tailspin-toys/issues/1",
        priority: "High",
        justification: "Search is a high-value discovery path for every catalog visitor and has a focused scope, making it a strong candidate for quick user-facing impact.",
    },
    {
        number: 2,
        title: "Allow users to sort the game list",
        body: "Let users sort by title in either direction and by highest star rating, with a documented ordering for unrated games and accessible controls.",
        url: "https://github.com/mohithkotian/tailspin-toys/issues/2",
        priority: "Medium",
        justification: "Sorting complements search and improves catalog usability without requiring schema changes, so it can be delivered as a contained follow-up to the list-page work.",
    },
    {
        number: 12,
        title: "Display star ratings on game cards",
        body: "Show each game's star rating on its card, including a clear fallback when a game has no rating.",
        url: "https://github.com/mohithkotian/tailspin-toys/issues/12",
        priority: "Medium",
        justification: "A small enhancement with limited risk, but less urgent than the navigation and performance improvements above.",
    },
    {
        number: 5,
        title: "Show a catalog summary on the home page",
        body: "Display the total game count and average rating on the home page, handling empty and unrated catalogs gracefully.",
        url: "https://github.com/mohithkotian/tailspin-toys/issues/5",
        priority: "Medium",
        justification: "This improves landing-page context but does not unblock core catalog navigation or address a scaling concern.",
    },
    {
        number: 4,
        title: "Add a publisher page listing that publisher's games",
        body: "Create prerendered publisher pages with descriptions, linked publisher names, reused game cards, and unit and end-to-end coverage.",
        url: "https://github.com/mohithkotian/tailspin-toys/issues/4",
        priority: "Medium",
        justification: "Useful catalog navigation, but a larger feature that is best tackled after the list-page discovery fundamentals are in place.",
    },
    {
        number: 3,
        title: "Show category and publisher descriptions on the game detail page",
        body: "Surface available category and publisher descriptions on game detail pages and extend the data helper and tests accordingly.",
        url: "https://github.com/mohithkotian/tailspin-toys/issues/3",
        priority: "Low",
        justification: "This is valuable supporting context, but it affects a narrower journey than the catalog-wide improvements above.",
    },
];

const servers = new Map();

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function issueCard(issue, isTopPriority) {
    return `<article class="card ${isTopPriority ? "top-card" : ""}">
        <div class="card-header"><span class="issue-number">#${issue.number}</span><span class="priority">${escapeHtml(issue.priority)}</span></div>
        <h3><a href="${escapeHtml(issue.url)}" target="_blank" rel="noreferrer">${escapeHtml(issue.title)}</a></h3>
        <p>${escapeHtml(issue.body)}</p>
        ${isTopPriority ? `<div class="why"><strong>Why it is here:</strong> ${escapeHtml(issue.justification)}</div>` : ""}
        <button type="button" data-issue-number="${issue.number}">Add to current context</button>
        <span class="result" aria-live="polite"></span>
    </article>`;
}

function renderHtml() {
    return `<!doctype html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Issue triage board</title>
    <style>
        :root { color-scheme: light dark; }
        body { margin: 0; padding: 24px; background: var(--background-color-default, #fff); color: var(--text-color-default, #1f2328); font-family: var(--font-sans, system-ui, sans-serif); line-height: 1.5; }
        main { max-width: 1100px; margin: 0 auto; }
        h1 { margin: 0 0 4px; font-size: 24px; }
        .intro { color: var(--text-color-muted, #656d76); margin: 0 0 24px; }
        section { margin-top: 28px; }
        h2 { font-size: 16px; margin: 0 0 12px; }
        .board { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
        .card { display: flex; flex-direction: column; gap: 10px; padding: 16px; border: 1px solid var(--border-color-default, #d0d7de); border-radius: 10px; background: var(--background-color-muted, #f6f8fa); }
        .top-card { border-color: var(--true-color-blue, #0969da); box-shadow: 0 0 0 1px var(--true-color-blue, #0969da); }
        .card-header { display: flex; justify-content: space-between; align-items: center; }
        .issue-number, .priority { font-size: 12px; font-weight: 600; }
        .issue-number { color: var(--text-color-muted, #656d76); }
        .priority { color: var(--true-color-blue, #0969da); }
        h3 { font-size: 16px; line-height: 1.3; margin: 0; }
        a { color: inherit; }
        p { margin: 0; font-size: 13px; }
        .why { padding: 10px; border-left: 3px solid var(--true-color-blue, #0969da); font-size: 13px; color: var(--text-color-muted, #656d76); }
        button { align-self: flex-start; border: 1px solid var(--border-color-default, #d0d7de); border-radius: 6px; padding: 7px 10px; background: var(--button-primary-bgColor-rest, #2da44e); color: var(--button-primary-fgColor-rest, #fff); font: inherit; font-size: 13px; cursor: pointer; }
        button:hover { filter: brightness(1.1); }
        button:focus-visible { outline: 2px solid var(--color-focus-outline, #0969da); outline-offset: 2px; }
        button[disabled] { opacity: .65; cursor: wait; }
        .result { min-height: 18px; font-size: 12px; color: var(--text-color-muted, #656d76); }
    </style>
</head>
<body>
    <main>
        <h1>Issue triage board</h1>
        <p class="intro">Top three issues are ranked by expected user impact, urgency, and delivery leverage.</p>
        <section aria-labelledby="top-heading">
            <h2 id="top-heading">Needs attention now</h2>
            <div class="board">${issues.slice(0, 3).map((issue) => issueCard(issue, true)).join("")}</div>
        </section>
        <section aria-labelledby="remaining-heading">
            <h2 id="remaining-heading">Next in line</h2>
            <div class="board">${issues.slice(3).map((issue) => issueCard(issue, false)).join("")}</div>
        </section>
    </main>
    <script>
        document.querySelectorAll("button[data-issue-number]").forEach((button) => {
            button.addEventListener("click", async () => {
                const result = button.nextElementSibling;
                button.disabled = true;
                result.textContent = "Adding...";
                try {
                    const response = await fetch("/add-context", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ issueNumber: Number(button.dataset.issueNumber) }),
                    });
                    const payload = await response.json();
                    if (!response.ok) throw new Error(payload.error || "Could not add issue");
                    result.textContent = "Added to current context.";
                } catch (error) {
                    result.textContent = error.message;
                    button.disabled = false;
                }
            });
        });
    </script>
</body>
</html>`;
}

async function startServer(instanceId, sendToSession) {
    const server = createServer((req, res) => {
        if (req.method === "GET" && req.url === "/") {
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.end(renderHtml());
            return;
        }

        if (req.method === "POST" && req.url === "/add-context") {
            let body = "";
            req.setEncoding("utf8");
            req.on("data", (chunk) => { body += chunk; });
            req.on("end", async () => {
                try {
                    const parsed = JSON.parse(body);
                    const issue = issues.find((candidate) => candidate.number === parsed.issueNumber);
                    if (!issue) throw new Error("Issue not found");
                    await sendToSession(`Work on GitHub issue #${issue.number}: ${issue.title}\n\n${issue.body}\n\nIssue URL: ${issue.url}`);
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ ok: true }));
                } catch (error) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
            return;
        }

        res.writeHead(404);
        res.end("Not found");
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    return { server, url: `http://127.0.0.1:${port}/`, instanceId };
}

const session = await joinSession({
    canvases: [
        createCanvas({
            id: "kanban-triage",
            displayName: "Issue triage board",
            description: "A Kanban board that ranks open repository issues and adds selected issues to the current session context.",
            actions: [
                {
                    name: "add_issue_to_context",
                    description: "Add an issue from the board to the current session context.",
                    inputSchema: {
                        type: "object",
                        properties: { issueNumber: { type: "integer" } },
                        required: ["issueNumber"],
                        additionalProperties: false,
                    },
                    handler: async (ctx) => {
                        const issue = issues.find((candidate) => candidate.number === ctx.input.issueNumber);
                        if (!issue) throw new Error(`Issue #${ctx.input.issueNumber} was not found on the board.`);
                        await session.send({ prompt: `Work on GitHub issue #${issue.number}: ${issue.title}\n\n${issue.body}\n\nIssue URL: ${issue.url}` });
                        return { ok: true, issueNumber: issue.number };
                    },
                },
            ],
            open: async (ctx) => {
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer(ctx.instanceId, (prompt) => session.send({ prompt }));
                    servers.set(ctx.instanceId, entry);
                }
                return { title: "Issue triage board", url: entry.url };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (entry) {
                    servers.delete(ctx.instanceId);
                    await new Promise((resolve) => entry.server.close(() => resolve()));
                }
            },
        }),
    ],
});
