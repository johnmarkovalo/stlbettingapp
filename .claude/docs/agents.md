# Agent Selection Guide

## Quick Selection

| Working on... | Use Agent |
|---------------|-----------|
| Starting new feature | `project-research-analyst` |
| After writing code | `code-refactoring-optimizer` |
| Security review | `security-style-reviewer` |
| Need tests | `test-coverage-validator` |
| Update docs | `documentation-agent` |
| Architecture decisions | `architecture-integration-designer` |

---

## Development Workflow

### Phase 1: Research (Before Coding)
**Agent:** `project-research-analyst`

### Phase 2: Quality Assurance (After Coding)
Run IN PARALLEL:
- `code-refactoring-optimizer`
- `security-style-reviewer`
- `test-coverage-validator`

### Phase 3: Documentation
**Agent:** `documentation-agent`
