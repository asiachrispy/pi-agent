/**
 * jtbd-sync Extension — JTBD 待办自动维护（pi-agent 工作区）
 *
 * A. before_agent_start：注入制度 + 确保个人 JTBD 文件存在
 * B. message_end：解析块、demand 联动、写文件、剥离 UI 中的 [JTBD-UPDATE]
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execSync } from "node:child_process";
import type { AgentMessage } from "@earendil-works/pi-agent-core";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isAssistantMessage } from "@earendil-works/pi-coding-agent";

const JTBD_DIR = "JTBD";
const DEMANDS_DIR = "demands";
const AGENT_ASSIGNEES = new Set(["team", "mk-dev", "mk-pm", "mk-qa", "mk-ship", "agent", "planner"]);

const JTBD_RULE_INJECTION = `
## JTBD 待办制度（项目强制规则，零人工维护）

个人文件：\`JTBD/<git-user>-jtbd.md\`（扩展会在会话开始时自动创建）。

**输出协议**：最终回复末尾放 **一个** \`[JTBD-UPDATE]…[/JTBD-UPDATE]\` 块（开标签 + 闭标签 \`[/JTBD-UPDATE]\`）。该块由扩展解析后**从界面移除**，用户不会看到。

### 何时禁止空块

以下任一情况 **不得** 输出空块，必须写 \`done:\` 或 \`add:\`：
- 创建/更新/续跑 \`demands/D-*.md\`
- 完成代码实现、验证、交付记录
- \`workflow_update.status\` 为 \`done\` 或 \`blocked\`
- 发现新的 follow-up 工作

**仅**纯问答、未改仓库、未动 demand 时，才允许空块（扩展会提示「本次无待办变更」）。

### 格式示例

\`\`\`
[JTBD-UPDATE]
done:
  - D-2026-002 pi-app 任务列表项目简称
add:
  - category: 待确认
    text: D-2026-003 等产品确认 AC
[/JTBD-UPDATE]
\`\`\`

### 判断规则

- \`done\`：JTBD「当前活跃」里已有项，或本次完成的 demand/任务关键词
- \`drop\`：明确放弃、重复、已由其他方式解决
- \`add\`：新 follow-up；\`category\` 常用：待确认、demand、pi-app、pi
- \`找谁\` 必须是真人，不写 agent 名；\`blocked\` 时扩展也会根据 demand 给 assignee 追加待办
- **不要问用户**——自行评估
`.trim();

interface JTBDUpdate {
	done: string[];
	drop: string[];
	add: { category: string; text: string }[];
}

interface WorkflowUpdate {
	demand?: string;
	status?: string;
	step?: string;
	assignee?: string;
	blocking_reason?: string;
}

interface DemandSnapshot {
	id: string;
	title: string;
	status: string;
	assignee: string;
	blockedAssignee?: string;
}

function getGit(cwd: string, cmd: string): string {
	try {
		return execSync(cmd, { cwd, encoding: "utf8" }).trim();
	} catch {
		return "";
	}
}

function findWorkspaceRoot(startCwd: string): string | null {
	let currentDir = path.resolve(startCwd);
	while (true) {
		const hasWiki = fs.existsSync(path.join(currentDir, "wiki"));
		const hasDemands = fs.existsSync(path.join(currentDir, DEMANDS_DIR));
		const hasAgents = fs.existsSync(path.join(currentDir, ".pi", "agents"));
		if (hasWiki && hasDemands && hasAgents) return currentDir;

		const parentDir = path.dirname(currentDir);
		if (parentDir === currentDir) return null;
		currentDir = parentDir;
	}
}

function slugifyUser(identifier: string): string {
	return identifier
		.toLowerCase()
		.replace(/@.*$/, "")
		.replace(/[^a-z0-9-]/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

function getCurrentUserSlug(cwd: string): string {
	let username = getGit(cwd, "git config user.name");
	if (!username) username = os.userInfo().username || "user";
	return slugifyUser(username);
}

function getJTBDPath(workspaceRoot: string, slug: string): string {
	return path.join(workspaceRoot, JTBD_DIR, `${slug}-jtbd.md`);
}

function getCurrentUserJTBDPath(workspaceRoot: string, cwd: string): string {
	return getJTBDPath(workspaceRoot, getCurrentUserSlug(cwd));
}

function ensurePersonalJTBD(workspaceRoot: string, cwd: string): string {
	const filePath = getCurrentUserJTBDPath(workspaceRoot, cwd);
	if (!fs.existsSync(filePath)) {
		writeJTBD(filePath, readJTBD(filePath));
	}
	return filePath;
}

function readJTBD(filePath: string): string {
	if (!fs.existsSync(filePath)) {
		return `# ${path.basename(filePath, ".md")} 待办任务\n\n> 跨会话持久化待办，个人命名空间。\n> 任务完成后由 agent 自动维护。\n\n## 当前活跃\n\n## 已完成\n\n`;
	}
	return fs.readFileSync(filePath, "utf8");
}

function writeJTBD(filePath: string, content: string): void {
	const dir = path.dirname(filePath);
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(filePath, content, "utf8");
}

function ensureTimestamp(content: string): string {
	const now = new Date().toISOString().split("T")[0];
	const lastUpdateRe = /\n> 最后更新：\d{4}-\d{2}-\d{2}[^\n]*\n?$/;
	if (lastUpdateRe.test(content)) {
		return content.replace(lastUpdateRe, `\n> 最后更新：${now}，来源：agent 自动同步\n`);
	}
	return content.replace(/\n*$/, `\n\n> 最后更新：${now}，来源：agent 自动同步\n`);
}

function findActiveTask(content: string, keyword: string): boolean {
	const lines = content.split("\n");
	let inActive = false;
	for (const line of lines) {
		if (line.startsWith("## 当前活跃")) {
			inActive = true;
			continue;
		}
		if (inActive && line.startsWith("## ")) return false;
		if (inActive && line.includes(keyword) && /^\s*-\s*\[\s\]/.test(line)) return true;
	}
	return false;
}

function markDone(content: string, keyword: string): string {
	const now = new Date().toISOString().split("T")[0];
	const lines = content.split("\n");
	const moved: string[] = [];
	let doneInsertAt = -1;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line.startsWith("## 已完成")) doneInsertAt = i + 1;
		if (line.includes(keyword) && /^\s*-\s*\[\s\]/.test(line)) {
			const done = line.replace(/^(\s*-\s*)\[\s\](\s*\*\*[^*]+\*\*.*)$/, `$1[x]$2 → ${now}`);
			moved.push(done);
			lines[i] = "";
		}
	}

	if (moved.length === 0) return content;
	if (doneInsertAt === -1) doneInsertAt = lines.length;
	lines.splice(doneInsertAt, 0, ...moved);

	return lines.filter((l, i) => l !== "" || (i > 0 && lines[i - 1] !== "")).join("\n");
}

function dropTask(content: string, keyword: string): string {
	return content
		.split("\n")
		.filter((line) => !(line.includes(keyword) && /^\s*-\s*\[\s\]/.test(line)))
		.join("\n");
}

function addTask(content: string, category: string, text: string): string {
	const now = new Date().toISOString().split("T")[0];
	const newTask = `- [ ] **${text}**\n  > 来源：${now} agent 自动识别\n`;

	const lines = content.split("\n");
	let activeStart = -1;
	let activeEnd = lines.length;

	for (let i = 0; i < lines.length; i++) {
		if (lines[i].startsWith("## 当前活跃")) {
			activeStart = i;
			break;
		}
	}

	if (activeStart === -1) {
		return content.replace(/\n*$/, `\n\n## 当前活跃\n\n${newTask}`);
	}

	for (let i = activeStart + 1; i < lines.length; i++) {
		if (lines[i].startsWith("## ")) {
			activeEnd = i;
			break;
		}
	}

	let categoryLineIdx = -1;
	for (let i = activeStart + 1; i < activeEnd; i++) {
		if (lines[i].trim() === `### ${category}`) {
			categoryLineIdx = i;
			break;
		}
	}

	if (categoryLineIdx >= 0) {
		let insertAt = activeEnd;
		for (let i = categoryLineIdx + 1; i < activeEnd; i++) {
			if (lines[i].startsWith("### ")) {
				insertAt = i;
				break;
			}
		}
		lines.splice(insertAt, 0, newTask);
	} else {
		lines.splice(activeEnd, 0, `\n### ${category}\n${newTask}`);
	}

	return lines.join("\n");
}

function parseUpdateBlock(text: string): JTBDUpdate {
	const result: JTBDUpdate = { done: [], drop: [], add: [] };
	const blockRe = /\[JTBD-UPDATE\]([\s\S]*?)\[\/JTBD-UPDATE\]/;
	const m = text.match(blockRe);
	if (!m) return result;
	const body = m[1];

	const parseList = (label: string): string[] => {
		const sectionRe = new RegExp(`${label}:\\s*\\n([\\s\\S]*?)(?=\\n\\w+:|$)`);
		const sm = body.match(sectionRe);
		if (!sm) return [];
		return sm[1]
			.split("\n")
			.map((l) => l.match(/^\s*-\s*(.+?)\s*$/))
			.filter((x): x is RegExpMatchArray => !!x)
			.map((x) => x[1]);
	};

	result.done = parseList("done");
	result.drop = parseList("drop");

	const addMatch = body.match(/add:\s*\n([\s\S]*?)$/);
	if (addMatch) {
		const items = addMatch[1].split(/\n(?=\s*-\s*category:)/);
		for (const item of items) {
			const catM = item.match(/category:\s*(.+?)\n/);
			const textM = item.match(/text:\s*(.+?)(?=\n|$)/);
			if (catM && textM) {
				result.add.push({ category: catM[1].trim(), text: textM[1].trim() });
			}
		}
	}

	return result;
}

function parseWorkflowUpdate(text: string): WorkflowUpdate | null {
	const yamlBlocks = [
		...text.matchAll(/```(?:yaml)?\s*\n([\s\S]*?)```/g),
		...text.matchAll(/(^|\n)workflow_update:\s*\n([\s\S]*?)(?=\n```|\n## |\n\[JTBD-UPDATE\]|\n---\s*\n|$)/g),
	];

	for (const match of yamlBlocks) {
		const body = match[1] ?? match[2];
		if (!body || !body.includes("workflow_update")) continue;

		const section = body.includes("workflow_update:")
			? body.slice(body.indexOf("workflow_update:"))
			: `workflow_update:\n${body}`;

		const pick = (key: string): string | undefined => {
			const m = section.match(new RegExp(`^\\s*${key}:\\s*(.+)$`, "m"));
			if (!m) return undefined;
			return m[1].replace(/^["']|["']$/g, "").trim() || undefined;
		};

		return {
			demand: pick("demand"),
			status: pick("status"),
			step: pick("step"),
			assignee: pick("assignee"),
			blocking_reason: pick("blocking_reason"),
		};
	}

	return null;
}

function extractDemandIds(text: string): string[] {
	return [...new Set([...text.matchAll(/D-20\d{2}-\d{3}/g)].map((m) => m[0]))];
}

function findDemandFile(workspaceRoot: string, demandId: string): string | null {
	const dir = path.join(workspaceRoot, DEMANDS_DIR);
	if (!fs.existsSync(dir)) return null;

	const exact = path.join(dir, `${demandId}.md`);
	if (fs.existsSync(exact)) return exact;

	const prefix = `${demandId}-`;
	for (const name of fs.readdirSync(dir)) {
		if (name.startsWith(prefix) && name.endsWith(".md")) {
			return path.join(dir, name);
		}
	}
	return null;
}

function parseDemandFrontmatter(content: string): Record<string, string> {
	const m = content.match(/^---\s*\n([\s\S]*?)\n---/);
	if (!m) return {};
	const fm: Record<string, string> = {};
	for (const line of m[1].split("\n")) {
		const kv = line.match(/^([a-z_]+):\s*(.*)$/);
		if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, "").trim();
	}
	return fm;
}

function parseBlockedAssignee(content: string): string | undefined {
	const section = content.match(/## 阻塞\s*\n([\s\S]*?)(?=\n## |\n---\s*\n|$)/);
	if (!section) return undefined;
	const who = section[1].match(/找谁[：:]\s*(.+)/);
	return who?.[1]?.trim();
}

function isHumanAssignee(value: string | undefined): value is string {
	if (!value) return false;
	const key = value.toLowerCase().trim();
	return !AGENT_ASSIGNEES.has(key);
}

function readDemandSnapshot(workspaceRoot: string, demandId: string): DemandSnapshot | null {
	const filePath = findDemandFile(workspaceRoot, demandId);
	if (!filePath) return null;

	const content = fs.readFileSync(filePath, "utf8");
	const fm = parseDemandFrontmatter(content);
	const titleMatch = content.match(/^#\s+(.+)$/m);

	return {
		id: fm.id || demandId,
		title: fm.title || titleMatch?.[1] || demandId,
		status: fm.status || "active",
		assignee: fm.assignee || "",
		blockedAssignee: parseBlockedAssignee(content),
	};
}

function mergeUpdates(base: JTBDUpdate, extra: JTBDUpdate): JTBDUpdate {
	const dedupe = (arr: string[]) => [...new Set(arr.filter(Boolean))];
	const addKey = (a: { category: string; text: string }) => `${a.category}::${a.text}`;
	const addMap = new Map<string, { category: string; text: string }>();
	for (const item of [...base.add, ...extra.add]) addMap.set(addKey(item), item);

	return {
		done: dedupe([...base.done, ...extra.done]),
		drop: dedupe([...base.drop, ...extra.drop]),
		add: [...addMap.values()],
	};
}

function demandDrivenUpdates(
	workspaceRoot: string,
	workflow: WorkflowUpdate | null,
	text: string,
): { perUser: Map<string, JTBDUpdate>; currentUser: JTBDUpdate } {
	const perUser = new Map<string, JTBDUpdate>();
	const currentUser: JTBDUpdate = { done: [], drop: [], add: [] };

	const demandIds = new Set<string>();
	if (workflow?.demand) demandIds.add(workflow.demand);
	for (const id of extractDemandIds(text)) demandIds.add(id);

	for (const demandId of demandIds) {
		const snap = readDemandSnapshot(workspaceRoot, demandId);
		if (!snap) continue;

		const status = workflow?.demand === demandId ? workflow.status || snap.status : snap.status;
		const keyword = `${snap.id} ${snap.title}`.trim();

		if (status === "done") {
			currentUser.done.push(keyword);
			continue;
		}

		if (status === "blocked") {
			const rawAssignee =
				(workflow?.demand === demandId ? workflow.assignee : undefined) || snap.assignee;
			const human =
				(isHumanAssignee(rawAssignee) && rawAssignee) ||
				(isHumanAssignee(snap.blockedAssignee) && snap.blockedAssignee);

			if (human) {
				const slug = slugifyUser(human);
				const reason =
					(workflow?.demand === demandId ? workflow.blocking_reason : undefined) ||
					snap.title ||
					"待确认";
				const existing = perUser.get(slug) || { done: [], drop: [], add: [] };
				existing.add.push({
					category: "待确认",
					text: `${snap.id} ${reason}`,
				});
				perUser.set(slug, existing);
			}
		}
	}

	return { perUser, currentUser };
}

function applyUpdate(filePath: string, update: JTBDUpdate): { changed: boolean; log: string[] } {
	const log: string[] = [];
	let content = readJTBD(filePath);
	let changed = false;

	for (const keyword of update.done) {
		if (findActiveTask(content, keyword)) {
			content = markDone(content, keyword);
			changed = true;
			log.push(`done: ${keyword}`);
		} else {
			log.push(`done skipped (not in active): ${keyword}`);
		}
	}

	for (const keyword of update.drop) {
		if (findActiveTask(content, keyword)) {
			content = dropTask(content, keyword);
			changed = true;
			log.push(`drop: ${keyword}`);
		} else {
			log.push(`drop skipped (not in active): ${keyword}`);
		}
	}

	for (const item of update.add) {
		if (findActiveTask(content, item.text)) {
			log.push(`add skipped (already active): ${item.text}`);
			continue;
		}
		content = addTask(content, item.category, item.text);
		changed = true;
		log.push(`add [${item.category}]: ${item.text}`);
	}

	if (changed) {
		content = ensureTimestamp(content);
		writeJTBD(filePath, content);
	}

	return { changed, log };
}

function stripJTBDBlock(text: string): string {
	return text
		.replace(/\n*```[^\n]*\n\[JTBD-UPDATE\][\s\S]*?\[\/JTBD-UPDATE\]\s*\n```/g, "")
		.replace(/\n*\[JTBD-UPDATE\][\s\S]*?\[\/JTBD-UPDATE\]/g, "")
		.replace(/\n{3,}/g, "\n\n")
		.trimEnd();
}

function extractText(message: { content: unknown }): string {
	if (typeof message.content === "string") return message.content;
	if (Array.isArray(message.content)) {
		return (message.content as Array<{ type?: string; text?: string }>)
			.filter((c) => c.type === "text")
			.map((c) => c.text || "")
			.join("\n");
	}
	return "";
}

function stripJTBDFromMessage(message: AgentMessage): AgentMessage {
	const text = extractText(message);
	if (!text.includes("[JTBD-UPDATE]")) return message;

	const stripped = stripJTBDBlock(text);
	if (stripped === text) return message;

	if (typeof message.content === "string") {
		return { ...message, content: stripped };
	}

	if (Array.isArray(message.content)) {
		const parts = message.content as Array<{ type?: string; text?: string }>;
		let remaining = stripped;
		const next = parts.map((part) => {
			if (part.type !== "text" || typeof part.text !== "string") return part;
			if (!remaining) return { ...part, text: "" };
			if (part.text.includes("[JTBD-UPDATE]")) {
				const replaced = { ...part, text: remaining };
				remaining = "";
				return replaced;
			}
			return part;
		});
		return { ...message, content: next };
	}

	return message;
}

function syncJTBDIndex(workspaceRoot: string): void {
	const script = path.join(workspaceRoot, "scripts", "sync-jtbd-index.sh");
	if (!fs.existsSync(script)) return;
	try {
		execSync(`bash "${script}"`, { cwd: workspaceRoot, encoding: "utf8", stdio: "pipe" });
	} catch {
		// index sync is best-effort
	}
}

function hasUpdateChanges(update: JTBDUpdate): boolean {
	return update.done.length > 0 || update.drop.length > 0 || update.add.length > 0;
}

export default function (pi: ExtensionAPI) {
	pi.on("before_agent_start", async (event, ctx) => {
		const root = findWorkspaceRoot(ctx.cwd);
		if (root) ensurePersonalJTBD(root, ctx.cwd);

		return {
			systemPrompt: event.systemPrompt + "\n\n" + JTBD_RULE_INJECTION,
		};
	});

	pi.on("message_end", async (event, ctx) => {
		if (!isAssistantMessage(event.message)) return;

		const text = extractText(event.message);
		const hasJTBDBlock = text.includes("[JTBD-UPDATE]");
		const workspaceRoot = findWorkspaceRoot(ctx.cwd);

		const manualUpdate = hasJTBDBlock ? parseUpdateBlock(text) : { done: [], drop: [], add: [] };
		const workflow = parseWorkflowUpdate(text);
		const demandDerived = workspaceRoot
			? demandDrivenUpdates(workspaceRoot, workflow, text)
			: { perUser: new Map<string, JTBDUpdate>(), currentUser: { done: [], drop: [], add: [] } };

		const currentUserUpdate = mergeUpdates(manualUpdate, demandDerived.currentUser);
		const anyChanges =
			hasUpdateChanges(currentUserUpdate) ||
			[...demandDerived.perUser.values()].some(hasUpdateChanges);

		if (workspaceRoot) {
			setImmediate(() => {
				try {
					const logs: string[] = [];
					let anyFileChanged = false;

					const currentPath = ensurePersonalJTBD(workspaceRoot, ctx.cwd);
					const { changed, log } = applyUpdate(currentPath, currentUserUpdate);
					if (changed) anyFileChanged = true;
					logs.push(...log);

					for (const [slug, update] of demandDerived.perUser) {
						if (!hasUpdateChanges(update)) continue;
						const targetPath = getJTBDPath(workspaceRoot, slug);
						if (!fs.existsSync(targetPath)) writeJTBD(targetPath, readJTBD(targetPath));
						const result = applyUpdate(targetPath, update);
						if (result.changed) anyFileChanged = true;
						logs.push(...result.log.map((l) => `[${slug}] ${l}`));
					}

					if (anyFileChanged) syncJTBDIndex(workspaceRoot);

					if (anyFileChanged) {
						const summary = logs.filter((l) => !l.includes("skipped")).join("; ");
						ctx.ui.notify(`JTBD 自动更新：${summary || "已写入"}`, "info");
					} else if (hasJTBDBlock || workflow?.status === "blocked" || workflow?.status === "done") {
						const detail = logs.length ? ` (${logs.join("; ")})` : "";
						ctx.ui.notify(`JTBD：本次无待办变更${detail}`, "info");
					}
				} catch (e) {
					ctx.ui.notify(`JTBD 更新失败：${e}`, "error");
				}
			});
		} else if (hasJTBDBlock) {
			ctx.ui.notify("JTBD：未找到 pi-agent 工作区根目录，跳过同步", "warning");
		}

		if (hasJTBDBlock) {
			const stripped = stripJTBDFromMessage(event.message);
			if (stripped !== event.message) return { message: stripped };
		}
	});
}
