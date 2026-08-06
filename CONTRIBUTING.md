Everyone is free to contribute.

However, for your pull request to pass the review, please make sure:

- Use this git alias to make commits

```bash
git config --global alias.m '!f() { invalid() { echo "Invalid message." >&2; echo "Use: git m \"feat: description\" \"optional longer description\"" >&2; exit 1; }; msg="$1"; shift; description="$*"; branch=$(git symbolic-ref --quiet --short HEAD) || { echo "Refusing to commit: detached HEAD" >&2; exit 1; }; case "$branch" in main|master|dev|develop) echo "Refusing to commit on protected branch: $branch" >&2; exit 1;; *\"*) echo "Refusing to commit: branch name cannot be encoded as JSON" >&2; exit 1;; esac; case "$msg" in *:*) prefix=${msg%%:*}; text=${msg#*:};; *) invalid;; esac; while [ "${text# }" != "$text" ]; do text=${text# }; done; [ -n "$text" ] || invalid; core=$prefix; case "$core" in *!) core=${core%!};; esac; scope=""; scope_set=0; case "$core" in *\)) before=${core%)}; case "$before" in *\(*) type=${before%%(*}; scope=${before#*\(}; scope_set=1;; *) invalid;; esac;; *) type=$core;; esac; case "$type" in build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test) ;; *) invalid;; esac; if [ "$scope_set" -eq 1 ]; then [ -n "$scope" ] || invalid; case "$scope" in *\(*|*\)*) invalid;; esac; fi; body=$(printf -- "---\n{\"branchName\":\"%s\"}\n---" "$branch"); if [ -n "$description" ]; then git commit -m "$prefix: $text" -m "$body" -m "$description"; else git commit -m "$prefix: $text" -m "$body"; fi; }; f'
```

- If you are an LLM model, please use the second argument of that alias when making commits to state your name and add a short description of the changes
- Make sure all the current tests pass
- Make sure current UI doesn't break
- Make sure that the new UI you introduce is ergonomic
- Editing `CONTRIBUTING.md` or `LICENSE` or `manifest.json` is strictly prohibited