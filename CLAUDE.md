This is a greenfield project with no production users or legacy constraints. When refactoring or modifying code:

- No backward compatibility required
- No fallback mechanisms needed
- No defensive code for old data/formats
- No progressive or phased migrations
- No deprecation periods—delete and replace directly
- No feature flags for gradual rollouts
- No auto migrations

Prefer clean, direct implementations over defensive patterns. 

---
[IMPORTANT]
@packages/adkflow-runner is part of this project and need to be considered when refactoring, debuging, fixing, and implemeting features.

---
Use `uv run` to ran python code and `uv add` to install packages.
