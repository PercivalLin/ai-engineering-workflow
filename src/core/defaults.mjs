export const ROLES = {
  pm: {
    title: "Product Manager",
    mission: "Clarify product goal, target users, scope, success criteria, and acceptance criteria.",
    inputs: ["user goal", "project context", "global product and delivery principles"],
    outputs: ["requirements document", "acceptance criteria", "scope boundaries", "clarifying questions"],
    gates: ["requirements"]
  },
  architect: {
    title: "Architect / Tech Lead",
    mission: "Design architecture, interfaces, data flow, migrations, rollout, rollback, and ADRs.",
    inputs: ["requirements", "project context", "risk level", "stack knowledge"],
    outputs: ["ADR", "interface contract", "risk register", "rollback design"],
    gates: ["architecture"]
  },
  delivery_manager: {
    title: "Delivery Manager",
    mission: "Break work into small batches, limit WIP, maintain blockers, and drive workflow state.",
    inputs: ["requirements", "ADR", "workflow state"],
    outputs: ["backlog", "task queue", "Definition of Ready", "Definition of Done"],
    gates: ["planning"]
  },
  developer: {
    title: "Developer",
    mission: "Implement small, traceable code changes with tests and minimal unrelated edits.",
    inputs: ["task packet", "existing code", "playbooks", "anti-patterns"],
    outputs: ["code change", "tests", "ChangeSet", "implementation notes"],
    gates: ["build_loop"]
  },
  qa: {
    title: "QA Engineer",
    mission: "Create and run test matrix for normal, edge, failure, regression, and acceptance scenarios.",
    inputs: ["requirements", "changesets", "test commands"],
    outputs: ["test evidence", "failure reproduction", "coverage notes"],
    gates: ["verification_loop"]
  },
  security: {
    title: "Security Engineer",
    mission: "Assess threat model, dependencies, secrets, permissions, data handling, and release risk.",
    inputs: ["requirements", "architecture", "dependency inventory", "changesets"],
    outputs: ["security evidence", "threat model updates", "risk exceptions"],
    gates: ["verification_loop", "release_readiness"]
  },
  sre: {
    title: "SRE / DevOps",
    mission: "Validate CI, deployment, rollback, monitoring, SLO impact, and operational readiness.",
    inputs: ["release plan", "runtime context", "verification evidence"],
    outputs: ["deployment plan", "rollback plan", "monitoring notes", "SLO impact"],
    gates: ["release_readiness"]
  },
  reviewer: {
    title: "Code Reviewer",
    mission: "Review diff, design fit, maintainability, test adequacy, and unintended behavior.",
    inputs: ["changesets", "requirements", "ADR", "evidence"],
    outputs: ["review evidence", "blocking findings", "approval or requested changes"],
    gates: ["review_gate"]
  },
  writer: {
    title: "Technical Writer",
    mission: "Produce user-facing delivery summary, README/API updates, changelog, and handoff notes.",
    inputs: ["requirements", "changesets", "release plan", "audit evidence"],
    outputs: ["release notes", "documentation updates", "handoff packet"],
    gates: ["release_readiness"]
  },
  learning_coach: {
    title: "Learning Coach",
    mission: "Convert real feedback into global experience, anti-patterns, playbooks, and sandbox rules.",
    inputs: ["timeline", "review feedback", "test failures", "incidents", "delivery metrics"],
    outputs: ["learning proposal", "candidate experience", "sandbox rules"],
    gates: ["retro_learn"]
  },
  trace_auditor: {
    title: "Trace Auditor",
    mission: "Ensure every modification links to requirement, decision, agent, evidence, review, and rollback.",
    inputs: ["trace ledger", "decision log", "changesets", "evidence"],
    outputs: ["audit bundle", "traceability matrix", "missing trace findings"],
    gates: ["archive"]
  }
};

export const WORKFLOW_PHASES = [
  "intake",
  "context_scan",
  "experience_retrieval",
  "clarification_gate",
  "requirements",
  "architecture",
  "planning",
  "build_loop",
  "verification_loop",
  "review_gate",
  "release_readiness",
  "retro_learn",
  "archive"
];

export const PHASE_OWNER = {
  intake: "pm",
  context_scan: "delivery_manager",
  experience_retrieval: "learning_coach",
  clarification_gate: "pm",
  requirements: "pm",
  architecture: "architect",
  planning: "delivery_manager",
  build_loop: "developer",
  verification_loop: "qa",
  review_gate: "reviewer",
  release_readiness: "sre",
  retro_learn: "learning_coach",
  archive: "trace_auditor"
};

export const DEFAULT_PRINCIPLES = [
  {
    id: "principle_small_traceable_changes",
    type: "principle",
    scope: "global",
    status: "default",
    trigger: "Any implementation task",
    lesson: "Prefer small, focused changes that can be reviewed, tested, reverted, and traced to one requirement.",
    evidence: ["industry_practice", "review_quality"],
    confidence: 0.9
  },
  {
    id: "principle_explore_before_asking",
    type: "principle",
    scope: "global",
    status: "default",
    trigger: "Before asking the user for clarification",
    lesson: "Inspect repository facts, configuration, tests, documentation, and existing patterns before asking the user.",
    evidence: ["workflow_policy"],
    confidence: 0.9
  },
  {
    id: "principle_tests_follow_logic",
    type: "principle",
    scope: "global",
    status: "default",
    trigger: "Logic or behavior changes",
    lesson: "Behavior changes require new or updated tests unless the change is explicitly documentation-only.",
    evidence: ["review_quality", "defect_prevention"],
    confidence: 0.88
  }
];

export const DEFAULT_PLAYBOOKS = [
  {
    id: "playbook_new_api",
    type: "playbook",
    scope: "global",
    status: "default",
    trigger: "Adding or changing an API",
    lesson: "Define contract, compatibility, validation, auth, negative tests, docs, and rollout before implementation.",
    evidence: ["engineering_practice"],
    confidence: 0.82
  },
  {
    id: "playbook_database_migration",
    type: "playbook",
    scope: "global",
    status: "default",
    trigger: "Database schema or data migration",
    lesson: "Plan forward migration, rollback, backfill, data validation, downtime risk, and compatibility window.",
    evidence: ["operational_risk"],
    confidence: 0.84
  },
  {
    id: "playbook_frontend_feature",
    type: "playbook",
    scope: "stack:frontend",
    status: "default",
    trigger: "Building a user-facing UI",
    lesson: "Confirm user flow, states, responsiveness, accessibility, visual QA, and no text overlap before delivery.",
    evidence: ["ux_quality"],
    confidence: 0.8
  }
];

export const DEFAULT_ANTI_PATTERNS = [
  {
    id: "anti_pattern_unrelated_refactor",
    type: "anti_pattern",
    scope: "global",
    status: "default",
    trigger: "A task tempts broad cleanup",
    lesson: "Do not mix unrelated refactors with feature or bug-fix changes; split them into separately traceable work.",
    evidence: ["review_latency", "rollback_risk"],
    confidence: 0.85
  },
  {
    id: "anti_pattern_unverified_assumption",
    type: "anti_pattern",
    scope: "global",
    status: "default",
    trigger: "Missing product, security, or architecture facts",
    lesson: "Mark assumptions explicitly and ask the user when the uncertainty changes product behavior, cost, compliance, or risk.",
    evidence: ["workflow_policy"],
    confidence: 0.86
  }
];

export const DEFAULT_ROLE_CHECKLISTS = [
  {
    id: "checklist_reviewer",
    type: "role_checklist",
    scope: "global",
    status: "default",
    trigger: "reviewer role",
    lesson: "Check requirement traceability, behavioral correctness, tests, maintainability, security impact, and rollback path.",
    evidence: ["review_quality"],
    confidence: 0.83
  },
  {
    id: "checklist_trace_auditor",
    type: "role_checklist",
    scope: "global",
    status: "default",
    trigger: "trace auditor role",
    lesson: "Every ChangeSet must link to task, requirement or decision, agent, diff hash, commands, tests, evidence, review, risk, and rollback plan.",
    evidence: ["auditability"],
    confidence: 0.9
  }
];
