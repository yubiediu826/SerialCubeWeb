---
name: subagent-driven-development
description: Use when executing implementation plans with independent tasks in the current session
---

# Subagent-Driven Development

Execute plan by dispatching a fresh implementer subagent per task, a task review (spec compliance + code quality) after each, and a broad whole-branch review at the end.

**Why subagents:** You delegate tasks to specialized agents with isolated context. By precisely crafting their instructions and context, you ensure they stay focused and succeed at their task. They should never inherit your session's context or history — you construct exactly what they need. This also preserves your own context for coordination work.

**Core principle:** Fresh subagent per task + task review (spec + quality) + broad final review = high quality, fast iteration

**Narration:** between tool calls, narrate at most one short line — the
ledger and the tool results carry the record.

**Continuous execution:** Do not pause to check in with your human partner between tasks. Execute all tasks from the plan without stopping. The only reasons to stop are: BLOCKED status you cannot resolve, ambiguity that genuinely prevents progress, or all tasks complete. "Should I continue?" prompts and progress summaries waste their time — they asked you to execute the plan, so execute it.

## When to Use

Use subagent-driven-development when:
- Have an implementation plan
- Tasks are mostly independent
- Stay in this session

Use executing-plans when:
- No subagents available, or
- Working in a separate parallel session

Use brainstorming / clarification first when:
- No implementation plan exists yet
- Tasks are tightly coupled (not independent)

## The Process

For each task:
1. **Dispatch implementer subagent** with task brief + interfaces + report file path
2. **Handle report**: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED
3. **Generate review package** (BASE..HEAD diff), dispatch task reviewer
4. **Spec + quality approved?** → complete; else enter fix loop
5. **Fix loop**: up to 5 rounds (1-3 resume implementer, 4-5 fresh + more capable model)
6. **At cap**: adjudicate each open finding (park with ruling OR STOP on load-bearing)

After all tasks:
- **Final whole-branch review** (most capable model)
- **One fix wave** if needed
- **Delete plan workspace** (record lives in git)
- **finishing-a-development-branch**

## Setup

- Use superpowers:using-git-worktrees to create isolated workspace (or verify existing)
- Never start on main/master without explicit user consent
- Track progress in ledger file at `<workspace>/progress.md` (NOT only in todos — survives compaction)
- Ledger first line: `# SDD ledger — plan: <plan file path>`
- Each plan owns a workspace: `<repo-root>/.superpowers/sdd/<plan-basename>/`
- Resume from ledger: tasks with `Task <N>: complete` are done; resume at first task without

Read the plan once, note Global Constraints, create a todo per task.

**Pre-flight scan:** Before Task 1, scan plan for conflicts:
- tasks that contradict each other or Global Constraints
- plan mandates that review rubric treats as defect

Present findings as one batched question, not one interrupt per discovery.

## Model Selection

Use the least powerful model that can handle each role.

- **Mechanical implementation** (isolated functions, clear specs, 1-2 files): fast, cheap
- **Integration and judgment** (multi-file coordination, pattern matching, debugging): standard
- **Architecture and design**: most capable
- **Final whole-branch review**: most capable (NOT session default)
- **Review tasks**: scale to diff size/complexity/risk
- **Fix-loop rounds 4-5**: one tier above implementer that got stuck

**Always specify model explicitly** when dispatching — omitted model inherits session default (often most expensive).

**Turn count beats token price.** Mid-tier model as floor for reviewers and implementers. When plan text contains complete code, use cheapest tier for implementer (transcription + testing).

## Task Loop

### 1. Dispatch the implementer

Record BASE (`git rev-parse HEAD`) before dispatching.

- **Task brief**: extract task's full text to uniquely named file (use `scripts/task-brief PLAN_FILE N`)
- Dispatch contains: (1) one line on where this task fits; (2) brief path; (3) interfaces from earlier tasks; (4) resolution of ambiguity; (5) report-file path + report contract
- **Report file**: name after brief (`task-N-brief.md` → `task-N-report.md`)
- Don't paste accumulated history — fresh subagent needs only its task
- Never dispatch multiple implementer subagents in parallel (conflicts)
- Record implementer's agent identity — fix-loop rounds 1-3 resume this agent

### 2. Handle the report

Four statuses:
- **DONE**: dispatch task reviewer
- **DONE_WITH_CONCERNS**: read concerns first, address correctness/scope before review
- **NEEDS_CONTEXT**: provide missing context, re-dispatch
- **BLOCKED**: assess — context problem / more capable model / break into smaller / escalate

### 3. Review the task

- Hand reviewer diff as file: `scripts/review-package PLAN_FILE BASE HEAD` (prints path)
- Reviewer gets: brief path, report path, review package path, global constraints
- Global-constraints block: exact values verbatim from spec
- Don't pre-judge findings — let reviewer raise, adjudicate later
- ⚠️ "Cannot verify from diff" items: resolve yourself (you hold cross-task context)

### 4. The fix loop

**Two routes leave the loop immediately:**
- Minor findings: record in ledger as deferred, point final review at them
- Plan-mandated finding conflicting with plan text: ask human which governs

**Everything else enters the loop. Five rounds max:**

- **Rounds 1-3**: resume original implementer (it has context). Send findings verbatim.
- **Rounds 4-5**: fresh implementer on more capable model. Brief + report + findings + "prior implementer tried N times, you own it now."
- **Each round**: fix + re-run covering tests + append to report file + return short contract
- **Re-review is scoped**: `scripts/review-package PLAN_FILE FIX_BASE HEAD` + re-review-prompt.md
- New Critical/Important in fix diff joins open list; out-of-scope to ledger as deferred minors
- **After each round**: append to ledger `Task <N>: fix round <R>/5 (<X> addressed, <Y> open — <finding one-liners>; commits <a7>..<b7>)`

**Never fix findings yourself in controller session** — pollutes context, skips review.

**The breaker (round 5 cap):**
- Reviewer wrong / contestable → park with ruling
- Real but nothing downstream builds → park with ruling
- Real and load-bearing → STOP, report BLOCKED to human

Adjudicate only at cap. Adjudicating earlier to end loop is pre-judging with different name. Every adjudication is a ledger entry.

### 5. Complete the task

Ledger lines:
- `Task <N>: complete (commits <base7>..<head7>, review clean)`
- `Task <N>: complete (commits <base7>..<head7>, <K> parked)` after tripped breaker

Mark todo complete. Never move to next task with open Critical/Important.

## Final Review

- Run `scripts/review-package PLAN_FILE MERGE_BASE HEAD`
- Dispatch on most capable model (using requesting-code-review/code-reviewer.md)
- Point at ledger's deferred-minor and parked lines for triage
- ONE fix subagent with complete findings list (not per-finding)
- ONE scoped re-review of fix wave
- Adjudicate residuals at cap

## Finish

- Delete plan workspace (`rm -rf <workspace>`) — git history is record
- Use superpowers:finishing-a-development-branch

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Close enough on spec compliance" | Reviewer found spec gaps = not done |
| "I'll fix it myself, dispatching is overhead" | Controller fixes pollute context, skip review |
| "One more round will converge" | Past cap, rounds don't converge — failure is structural |
| "Reviewer will just find new things anyway" | Scoped re-reviews verify fixes; can't wander |
| "This finding is obviously wrong, drop it" | Adjudicate only at cap, every ruling is ledger entry |
| "Fix was small, skip re-review" | Unreviewed fixes are how regressions land |
| "Reviews slow the loop" | Loop without reviews is unverified churn |
| "Ledger bookkeeping is overhead" | Ledger survives compaction — without it, controllers re-dispatch entire sequences |
