## Pull Request Creation Rules

### 1. Basic Rules

- Base branch is fixed to main

### 2. Using GitHub MCP

#### GitHub MCP Usage Example

Create pull requests via MCP.

```typescript
// MCP usage example in Claude Code
await mcp__github__create_pull_request({
  owner: 'Findy',
  repo: 'ai-collaboration-labeler',
  title: 'fix: bug',
  head: 'feature-branch',
  base: 'main',
  body: '...',
});
```

- Always use the template
  - `./.github/PULL_REQUEST_TEMPLATE.md`
- title
  - <First line of commit message>
- body
  - Only append to the template content, do not delete or modify it
  - Do not escape `<!-- -->` comments in the template

#### Notes

- Appropriate permissions (repository access) are required when using MCP
- Specify branch names and repository names accurately
- Always use the template
- If errors occur, recheck permission settings and file paths

## Commit Rules

### Format Specification

- Commit messages should follow the type: subject format, with optional body and footer.

#### Notes

- Use present tense verbs (e.g., "add", "fix", "update")
- Describe changes concisely and specifically
- Split commits when there are multiple changes

#### Fields

- type is required
- description is required
- longer description is optional

### type

Select from the following:

- feat
  - New feature development
- fix
  - Bug fixes
  - Typo corrections
- docs
  - Document additions and modifications
- style
  - Changes that don't affect code behavior
  - Changes from running linters etc.
- refactor
  - Implementation changes without behavioral changes
- test
  - Test additions and modifications
- build
  - Build system related changes
- ci
  - CI (GitHub Actions) related additions and changes
- chore
  - Configuration file modifications
  - Other changes not covered by the above types
- revert
  - For reverting changes

### description

Write concisely in simple English that non-native speakers can understand.
If the content is complex and cannot be written in simple English, Japanese is acceptable.

### Co-Authored-By for AI Agents

When AI agents perform work, add `Co-Authored-By` to the commit message:
- Example for Claude Code: `Co-Authored-By: Claude <noreply@anthropic.com>`

### Example

```
feat: add component
```

## Commit and Push Restrictions

### Branch Restrictions

- **Never commit directly to the main branch**
- Always create feature or fix branches for development and bug fixes
- Merge to main branch only via pull requests

### Commit Precautions

- Never commit sensitive files (.env, API keys, tokens, files containing authentication credentials)
- Use environment variables for secret information and do not include credentials in logs or outputs

### Push Precautions

- Verify security measures before pushing
- Double-check that no sensitive information is included
