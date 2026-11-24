---
inclusion: always
---

# Shell Commands Without Repeated Approvals

Shell command approvals are stored as patterns that match the start of a command (of the form `<command-name> *`). A command that starts with a new word needs a fresh approval, even after "trust for this session" or "trust for this workspace". Write every command so it matches a pattern that is already approved.

The shell is PowerShell on Windows. Use PowerShell syntax where syntax matters, but prefer avoiding shell-specific constructs entirely by following the rules below.

## Rules

1. **Edit files with file tools, never the shell.**
   - `str_replace` for targeted edits, `fs_write` for new files or full rewrites, `fs_append` for appending.
   - Never edit file contents with `Set-Content`, `Out-File`, `[IO.File]::WriteAllText`, `-replace` pipelines, redirection (`>`, `>>`) or `sed`-style commands.

2. **Read and search with file tools first.** Use `read_file`, `grep_search`, `file_search` and `list_directory` (or the codebase graph tools) before reaching for the shell. `grep_search` is the tool for recursive searches across folders.
   - If a shell read or search is still needed, use `Get-Content`, `Get-ChildItem` or `Select-String` by their full names.
   - Never use their aliases (`cat`, `type`, `gc`, `ls`, `dir`, `gci`, `sls`). Aliases start with a different word, so they don't match the approved patterns.
   - Limit output with parameters instead of pipes, for example `Get-Content <file> -TotalCount 40`, `Get-Content <file> -Tail 20`, `Select-String -Path <folder>\*.ts -Pattern "<text>" -List`.

3. **Start every command with an allowed command name**, with nothing before it:

   | Need | Starting command name |
   |---|---|
   | Version control | `git` |
   | Scripts and multi-step logic | `node` (run a script file, see rule 4) |
   | Packages and project scripts | `npm`, `npx` |
   | Containers | `docker` |
   | Reading, listing and searching (fallback, see rule 2) | `Get-Content`, `Get-ChildItem`, `Select-String` |

   - Do not invent other starting words. If a task needs something else, put it in a `node` script or ask the user first.
   - Never start with a variable assignment (`$p = ...`), function definition (`function Foo ...`), loop or block (`foreach`, `if`, `@( ... )`) or here-string (`@' ... '@`). These differ every time and can never match a pattern.
   - Never prefix a command with `cd`. Use the tool's working-directory (`cwd`) parameter.

4. **Pick the cheapest option in tokens.** Writing a script costs tokens for its full contents, so don't write one when a single approved command does the job.
   - One-off read, list or search: use a file tool or one approved command (rule 2). Don't write a script for it.
   - Logic that needs several steps, filtering or loops, or that you'll repeat several times this session: write one Node.js script with `fs_write` (for example `scripts/dev/check-docs.mjs`) and run it as `node scripts/dev/check-docs.mjs <args>`.
   - Pass changing values as arguments instead of rewriting the script. Reuse the script for the rest of the session.
   - Keep script output short: print only what's needed, not whole files or full objects.
   - Helper scripts that are not part of the project belong in a git-ignored folder. If the chosen folder is not in `.gitignore` yet, ask the user before adding it rather than committing throwaway scripts.

5. **One command per call.** Do not chain commands with `;`, `&&` or `|`. A chain may not match the approved patterns. Make separate tool calls, in parallel when they are independent.

6. **Keep common commands in their plain form:**
   - `git status`, `git diff ...`, `git add <files>`, `git commit -m "..."`, `git push ...`
   - `node <script> <args>`
   - `npm run lint`, `npm run build`, `npm install <pkg>`
   - `npx tsc --noEmit`, `npx eslint <path>`, `npx <tool> <args>`
   - `docker compose ...`

7. **No wrappers.** Do not use the PowerShell call operator (`& ...`), `powershell -Command "..."`, `pwsh -c` or `cmd /c` for anything that can run directly.

8. **Do not run long-running processes in a blocking call.** `npm run dev`, `npm start` and watch modes block execution. Start them with the background process tool, or ask the user to run them.

9. **Do not change approval settings.** Never add, remove or edit approved command patterns or other Kiro settings unless the user asks.

## Pre-flight Checklist

Before each shell command, confirm:

- A file tool cannot do this instead.
- It starts with `git`, `node`, `npm`, `npx`, `docker`, `Get-Content`, `Get-ChildItem` or `Select-String`, written in full and not as an alias. If not, move the logic into a `node` script or ask the user.
- It is the cheapest option in tokens: a single approved command rather than a new script, with output limited by parameters.
- It is a single command, not a chain.
- It is not long-running or interactive.
- It is not destructive (deletes, `git reset --hard`, force push, dropping data, database resets). If it is, get user approval first.
