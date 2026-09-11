---
description: 'Commenting, documentation, and TypeScript formatting standards'
applyTo: '**/*.{ts,astro}'
---

# Coding Standards

## Comments and Documentation

- Comment intent, constraints, and non-obvious decisions: explain **why** the
  code exists or why an approach was chosen.
- Do not restate what the code already says. Remove comments that merely
  paraphrase the next line.
- Keep comments current. When changing related code, update or remove comments
  that no longer describe the behavior; an outdated comment is a bug.
- Use TSDoc/JSDoc for every exported function in `db/` and `src/lib/`. Describe
  the function's purpose, every parameter (including injectable `db`
  parameters), and the return value. Document important thrown errors or
  side-effects when applicable.
- Reusable `.astro` components must document their `Props` interface with a
  concise description of the component contract and its fields. Page-only
  components do not need a separate API description unless they expose props
  used by another component.
- Test comments should explain complex setup or a non-obvious assertion, not
  narrate the test steps.

## TypeScript Formatting

- Use four spaces for indentation, single quotes for strings, semicolons, and
  trailing commas in multiline objects, arrays, and parameter lists.
- Keep imports grouped at the top of the file and use `import type` for
  type-only imports.
- Add explicit parameter and return types to functions, especially exported
  data-layer helpers. Prefer named interfaces or types over inline repeated
  object shapes.
- Keep formatting consistent with the surrounding file; use ESLint as the
  source of truth rather than introducing file-specific style exceptions.

ESLint enforces the machine-checkable parts of these rules, including explicit
return types for functions in `db/` and `src/lib/` and type-only imports.
Indentation and punctuation remain documented conventions because the existing
Astro and TypeScript tooling does not share a formatter configuration.
