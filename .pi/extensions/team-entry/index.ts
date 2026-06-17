/**
 * team-entry — 将 /team 注册为扩展命令，避免 prompt 模板整页展开到对话框。
 *
 * 用户输入 `/team D-2026-002 verify` 时，会话中只保留该短文本；
 * 执行协议由 `.pi/APPEND_SYSTEM.md` + `.pi/agents/team.md`（subagent）承载。
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	pi.registerCommand("team", {
		description: "pi-agent 唯一日常命令 — 澄清、实现、验证、交付与 demand 状态维护",
		handler: async (args, ctx) => {
			const trimmed = args.trim();
			const message = trimmed ? `/team ${trimmed}` : "/team";

			if (!ctx.isIdle()) {
				pi.sendUserMessage(message, { deliverAs: "followUp" });
				ctx.ui.notify("已排队 /team 任务", "info");
				return;
			}

			pi.sendUserMessage(message);
		},
	});
}
