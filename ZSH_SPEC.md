# zsh Specification Baseline

This repository uses the zsh 5.9.1 release manual as its official stable syntax reference baseline. zsh 5.9.1 is a stable maintenance release, released 2026-05-31.

The parser also carries targeted coverage for parser-visible syntax documented in upstream zsh development after 5.9 where that syntax is present in upstream manuals or tests. Runtime-only features remain outside this parser's scope.

Official sources:

- https://zsh.sourceforge.io/releases.html
- https://zsh.sourceforge.io/Doc/Release/
- https://zsh.sourceforge.io/Doc/Release/Shell-Grammar.html
- https://zsh.sourceforge.io/Doc/Release/Redirection.html
- https://zsh.sourceforge.io/Doc/Release/Functions.html
- https://zsh.sourceforge.io/Doc/Release/Arithmetic-Evaluation.html
- https://zsh.sourceforge.io/Doc/Release/Conditional-Expressions.html
- https://zsh.sourceforge.io/Doc/Release/Expansion.html
- https://zsh.sourceforge.io/Doc/Release/Zsh-Modules.html

## Parser Scope

`tree-sitter-zsh` is a Tree-sitter grammar for parsing zsh source syntax. It recognizes source structure and produces syntax trees for editor, query, and tooling use. It is not a shell implementation and does not execute or evaluate zsh programs.

The grammar is intentionally pragmatic and conservative. It targets common interactive, script, and startup-file syntax while adding zsh-specific syntax coverage where it is parser-visible in the zsh 5.9 manual.

## Covered Syntax Families

The project covers high-level syntax families including:

- commands, assignments, redirects, pipelines, lists, blocks, and subshells
- command substitutions, process substitutions, heredocs, and arithmetic forms
- function definitions, including zsh function forms and redirections
- standard shell control forms, plus zsh forms such as `repeat`, `foreach ... end`, `coproc`, and `nocorrect`
- `[[ ... ]]` conditional expressions, including unary, binary, boolean, and grouped forms
- parameter expansion forms, including flag lists and common zsh parameter operators
- glob syntax and glob qualifiers used in common zsh source
- representative `.zshrc`-style constructs such as aliases, exports, `autoload -Uz`, `zstyle`, `bindkey`, `emulate`, `setopt`, and `unsetopt`

## Non-Goals and Limitations

This parser does not claim full zsh implementation or complete specification compliance. In particular, it does not model:

- runtime option state or emulation mode behavior
- alias expansion
- glob matching or filesystem-dependent pattern results
- arithmetic evaluation
- parameter expansion execution or transformation semantics
- command, process, or expansion execution behavior
- module loading or modules' runtime effects
- shell execution semantics, side effects, or error handling

Syntax that depends on runtime shell state may be accepted conservatively when it is common in zsh source, but runtime-sensitive behavior remains outside the parser's scope.
