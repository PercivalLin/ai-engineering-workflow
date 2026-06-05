<h1 align="center">AI Engineering Workflow</h1>

<p align="center">
  <strong>把 Codex、Claude Code、Cursor 等 AI 编程 Agent 组织成可追溯的虚拟工程团队。</strong>
</p>

<p align="center">
  <a href="https://github.com/PercivalLin/ai-engineering-workflow/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/PercivalLin/ai-engineering-workflow/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://www.npmjs.com/package/ai-engineering-workflow"><img alt="npm" src="https://img.shields.io/npm/v/ai-engineering-workflow.svg"></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
  <img alt="Node.js >=20" src="https://img.shields.io/badge/node-%3E%3D20-339933.svg">
  <img alt="MCP" src="https://img.shields.io/badge/MCP-server-6f42c1.svg">
</p>

<p align="center">
  <a href="#安装">安装</a>
  ·
  <a href="#第一次运行">快速开始</a>
  ·
  <a href="#mcp-tools">MCP Tools</a>
  ·
  <a href="./docs/architecture.md">架构</a>
  ·
  <a href="./README.md">English</a>
</p>

<p align="center">
  <sub>适用于 Codex、Claude Code、Cursor、Gemini CLI 以及其他 AI 编程 Agent。</sub>
</p>

---

AI Engineering Workflow 不是另一个写代码模型。它是围绕 AI 编程模型搭建的工程化运行系统：角色、流程、门禁、全局经验、用户提问协议、Trace Ledger、ChangeSet、证据记录和审计包。

## 为什么需要它

现在的 AI 编程 Agent 可以很快写代码，但常常缺少真正工程团队的习惯：

- 只有在关键不确定影响产品、架构、成本、合规或验收时才问用户
- 区分产品、架构、交付、开发、QA、安全、SRE、Review、文档和复盘职责
- 让每次修改都小、可审查、可回滚
- 记录这次修改来自哪个需求、哪个决策、哪个 Agent、哪个任务包、跑过哪些测试
- 把真实项目反馈沉淀成跨项目复用的全局经验

这个项目的目标是让 AI 不只是“会写代码”，而是更像一个有流程、有证据、有复盘能力的工程团队。

## 它提供什么

- MCP Server 作为主要接入方式
- 从用户给出的产品目标自动推进工程流程
- 明确的虚拟团队角色和角色提示词
- 跨项目复用的 Global Engineering Memory
- 项目内 Trace Ledger、Decision Log、Evidence、ChangeSet 和 Audit Bundle
- “先探索，再提问”的关键问题协议
- 给 Codex、Claude Code、Cursor、Gemini CLI 等外部 Agent 的任务包
- 当前角色、当前阶段、当前状态的进度反馈提示词
- 给不支持 MCP 的 Agent 使用的 Prompt Pack
- 用于调试、检查、导出的轻量 CLI

## 它不是什么

- 它不是 Codex、Claude Code、Cursor 或 Gemini CLI 的替代品
- 它不会自己发明产品目标，产品目标仍然由用户给出
- 它不会静默控制你的 Git 或自动发布代码
- 它不会一开始就问一堆固定问题，而是在运行过程中发现关键问题才暂停询问
- 它不会只凭 AI 声称完成就通过门禁，门禁必须有证据

## 当前状态

项目目前处于 early alpha。

当前已经可用的是本地 MCP Server、自动流程推进、角色任务包、日志追溯、全局经验、门禁和审计导出。外部 Agent Adapter 目前以任务包为主，未来可以进一步增强成更完整的自动执行适配器。

建议先在低风险项目或小功能切片上试用。

## 文档

| 文档 | 说明 |
| --- | --- |
| [Repository Structure](./docs/repository-structure.md) | 仓库结构和新增代码应该放在哪里 |
| [Architecture](./docs/architecture.md) | MCP Server、Workflow Runtime、Memory、Trace Ledger 和 Adapter 边界 |
| [Workflow](./docs/workflow.md) | 阶段、门禁、暂停点和进度反馈 |
| [MCP Tools](./docs/mcp-tools.md) | 所有 MCP 工具和推荐调用方式 |
| [Roles](./docs/roles.md) | 虚拟工程团队角色与交接规则 |
| [Data And Traceability](./docs/data-and-traceability.md) | 日志保存位置和审计链路 |
| [Publishing](./docs/publishing.md) | GitHub 和 npm 发布清单 |
| [Testing Matrix](./TESTING.md) | 功能和测试覆盖矩阵 |

## 仓库结构

```text
.
├── bin/                  # CLI 入口和 MCP Server 启动器
├── src/                  # 运行时代码
│   ├── server.mjs        # stdio JSON-RPC MCP Server
│   └── core/             # workflow、memory、trace、context、project 模块
├── schemas/              # 可移植 JSON Schema
├── prompt-pack/          # 给非 MCP Agent 的提示词包
├── tests/                # Node 测试
├── docs/                 # 长文档
├── examples/             # 可复制的 MCP 配置和请求示例
└── .github/              # CI、Issue 模板、PR 模板
```

## 安装

### 通过 npm

发布后可以这样安装：

```bash
npm install -g ai-engineering-workflow
ai-engineering server
```

或者直接用 `npx`：

```bash
npx -y ai-engineering-workflow server
```

### 通过源码

```bash
git clone https://github.com/PercivalLin/ai-engineering-workflow.git
cd ai-engineering-workflow
npm run verify
node ./bin/ai-engineering.mjs server
```

需要 Node.js 20 或更高版本。

## MCP 配置

通过 npm 运行 MCP Server：

```json
{
  "mcpServers": {
    "ai-engineering-workflow": {
      "command": "npx",
      "args": ["-y", "ai-engineering-workflow", "server"],
      "env": {
        "AI_ENGINEERING_HOME": "/Users/you/.ai-engineering"
      }
    }
  }
}
```

通过本地源码运行 MCP Server：

```json
{
  "mcpServers": {
    "ai-engineering-workflow": {
      "command": "node",
      "args": ["/absolute/path/to/ai-engineering-workflow/bin/ai-engineering.mjs", "server"],
      "env": {
        "AI_ENGINEERING_HOME": "/Users/you/.ai-engineering"
      }
    }
  }
}
```

`AI_ENGINEERING_HOME` 是可选项。如果不设置，默认使用 `~/.ai-engineering` 保存全局经验。

## 第一次运行

正常入口是 `advance_workflow`。

用户先给一个产品目标，然后 Agent 调用 MCP 工具：

```json
{
  "project_root": "/absolute/path/to/target-product",
  "product_goal": "Build a traceable task manager where users can create tasks, assign owners, record status changes, and export an audit trail.",
  "adapter": "codex",
  "risk_level": "medium"
}
```

运行时会自动：

1. 注册用户给出的产品目标
2. 扫描目标项目结构
3. 检索相关全局经验
4. 只有发现高影响不确定时才问用户
5. 生成需求、架构说明和 backlog
6. 派发下一个角色任务包
7. 要求证据通过门禁
8. 记录 trace 并导出 audit bundle

CLI 调试示例：

```bash
ai-engineering advance \
  --project /absolute/path/to/target-product \
  --goal "Build a traceable task manager..." \
  --adapter codex
```

## 运行逻辑

核心循环可以理解成：

```text
用户给产品目标
  ↓
advance_workflow 自动推进
  ↓
能继续就继续
  ↓
发现关键未知就问用户
  ↓
需要执行就派发给 Codex / Claude Code / Cursor 等 Agent
  ↓
Agent 执行并记录 ChangeSet / Evidence
  ↓
run_gate 检查是否能进入下一阶段
  ↓
通过就继续，不通过就回到对应角色修复
  ↓
完成后导出 audit bundle，并沉淀全局经验
```

## Agent 进度反馈

MCP 响应会包含可以直接展示给用户的进度字段：

- `current_role`：当前活跃角色，例如 `developer` 或 `architect`
- `current_phase`：当前流程阶段，例如 `requirements`、`architecture`、`build_loop`
- `progress_message`：面向用户的简短状态说明
- `agent_feedback_prompt`：告诉执行 Agent 如何向用户解释当前状态

示例：

```json
{
  "current_role": "developer",
  "current_phase": "build_loop",
  "status": "external_agent_required",
  "progress_message": "[AI Engineering Workflow] Developer is active. Phase: build_loop. Status: external_agent_required.",
  "agent_feedback_prompt": "You are currently acting as: Developer.\nWorkflow phase: build_loop.\nWorkflow status: external_agent_required.\nTell the user this status briefly before continuing."
}
```

## 日志和数据保存位置

项目日志保存在目标项目里，不会默认写到这个工具仓库里，除非你把这个工具仓库本身作为目标项目。

项目内数据：

```text
<target-project>/.ai-engineering/project.yaml
<target-project>/.ai-engineering/workflow-state.json
<target-project>/.ai-engineering/trace-ledger.jsonl
<target-project>/.ai-engineering/decision-log.jsonl
<target-project>/.ai-engineering/evidence/
<target-project>/.ai-engineering/changesets/
<target-project>/.ai-engineering/context/
<target-project>/.ai-engineering/context/task-packets/
<target-project>/.ai-engineering/audit-bundles/
<target-project>/docs/ai-artifacts/
```

全局经验：

```text
~/.ai-engineering/memory/principles/
~/.ai-engineering/memory/playbooks/
~/.ai-engineering/memory/anti-patterns/
~/.ai-engineering/memory/cases/
~/.ai-engineering/memory/rules/
~/.ai-engineering/memory/role-checklists/
~/.ai-engineering/memory/stack-knowledge/
~/.ai-engineering/memory/organization-preferences/
~/.ai-engineering/agents/
~/.ai-engineering/sandbox-rules/
```

查看日志：

```bash
tail -n 20 <target-project>/.ai-engineering/trace-ledger.jsonl
tail -n 20 <target-project>/.ai-engineering/decision-log.jsonl
find <target-project>/.ai-engineering -maxdepth 2 -type f | sort
find ~/.ai-engineering -maxdepth 3 -type f | sort
```

## 虚拟团队角色

| 角色 | 职责 | 主要产物 |
| --- | --- | --- |
| PM | 澄清产品目标、用户、范围、优先级和验收标准 | PRD 或轻量产品说明、需求、成功标准 |
| Architect / Tech Lead | 设计技术方案、接口、风险、迁移和回滚 | ADR、接口契约、风险登记 |
| Delivery Manager | 拆分小批次任务并推进门禁 | backlog、任务队列、DoR、DoD |
| Developer | 实现可追溯的小改动 | 代码、测试、ChangeSet、实现说明 |
| QA | 验证验收、回归、边界和失败路径 | 测试矩阵、测试证据、失败复现 |
| Security | 检查威胁、依赖、Secret、权限和数据风险 | 安全审查、风险发现、证据 |
| SRE / DevOps | 检查 CI、部署、可观测性、SLO 和回滚 | 发布就绪、运维证据 |
| Reviewer | 独立审查 diff、架构一致性、测试和维护成本 | Review 发现、批准或阻塞 |
| Writer | 生成交付文档、README、API 文档、变更日志 | 文档、发布说明、迁移说明 |
| Learning Coach | 把真实反馈沉淀为全局经验 | 候选 playbook、反模式、规则 |
| Trace Auditor | 检查从目标到发布证据的完整链路 | 审计包、追踪矩阵、缺失链路 |

## 工作流

自动状态机包含：

1. Intake
2. Context Scan
3. Experience Retrieval
4. Clarification Gate
5. Requirements
6. Architecture
7. Planning
8. Build Loop
9. Verification Loop
10. Review Gate
11. Release Readiness
12. Retro / Learn
13. Archive

`advance_workflow` 会尽可能自动推进，直到遇到：

- 需要用户决策
- 需要外部 Agent 执行
- 门禁失败
- 任务完成
- 无法安全继续

## MCP Tools

| Tool | 用途 |
| --- | --- |
| `advance_workflow` | 高层自动流程推进入口 |
| `create_goal` | 创建产品目标或工程任务 |
| `scan_project_context` | 扫描仓库事实和测试命令 |
| `retrieve_global_experience` | 检索全局工程经验 |
| `get_role_action` | 获取某个角色的任务包 |
| `ask_user_decision` | 创建高影响用户问题 |
| `record_user_decision` | 记录用户回答 |
| `dispatch_agent_task` | 给 Codex、Claude Code、Cursor 等生成任务包 |
| `record_changeset` | 记录代码修改痕迹 |
| `record_artifact` | 记录需求、ADR、发布说明、复盘等产物 |
| `record_backlog` | 记录 Delivery Manager backlog |
| `record_evidence` | 记录测试、扫描、review、安全、部署或人工证据 |
| `run_gate` | 运行当前或指定阶段门禁 |
| `propose_learning` | 基于真实证据生成全局经验候选 |
| `promote_or_rollback_rule` | 推进或回滚候选规则 |
| `export_audit_bundle` | 导出完整审计包 |

## 开发

```bash
npm run check
npm test
npm run verify
npm run ci
npm run smoke
```

`npm run ci` 会运行测试，并执行 `npm pack --dry-run` 检查 npm 包内容。

## 发布

发布前建议：

```bash
npm run ci
npm publish --dry-run
npm publish
```

如果是 scoped public package：

```bash
npm publish --access public
```

## 安全和隐私

这个工具会记录产品目标、决策、任务包、命令、测试证据、ChangeSet 和审计包。公开日志、截图、审计包或全局经验前，请检查是否包含：

- 密钥、Token、私钥
- 用户或客户数据
- 私有仓库路径
- 产品策略
- 内部 URL
- 客户、供应商或组织名称

默认不要公开 `.ai-engineering/` 和 `docs/ai-artifacts/`，除非目标项目明确决定把这些审计资料作为公开产物。

## License

MIT
