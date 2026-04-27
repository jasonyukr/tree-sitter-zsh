# tree-sitter-zsh TODO

This file tracks the requested path from the current MVP parser toward broader zsh syntax coverage. Tree-sitter can parse syntax, but it should not implement runtime behavior such as option state, glob matching, arithmetic evaluation, or parameter-expansion transformation semantics.

## Requested compliance items

- [ ] Full zsh language/spec compliance
  - [x] Expand parser syntax coverage across the official zsh grammar.
  - [x] Keep runtime semantics out of the parser.
  - [x] Maintain real-world fixture coverage as syntax support grows.
- [ ] Full heredoc handling
  - [x] Parse heredoc redirections and delimiters.
  - [x] Parse representative heredoc bodies.
  - [ ] Add scanner-backed heredoc delimiter/body fidelity.
- [ ] Full arithmetic grammar
  - [x] Parse arithmetic commands `(( ... ))`.
  - [x] Parse arithmetic expansions `$(( ... ))` and `$[ ... ]`.
  - [x] Parse c-style `for (( init; test; update ))` loops.
- [ ] Full `[[ ... ]]` conditional grammar
  - [x] Parse unary and binary conditional expressions.
  - [x] Parse boolean composition with `&&`, `||`, and grouping.
  - [x] Parse pattern/glob operands inside conditionals.
- [x] Glob qualifiers
  - [x] Parse common glob words such as `*.zsh` and `**/*.zsh`.
  - [x] Parse bare qualifier suffixes such as `*(.)`.
  - [x] Parse extended qualifier suffixes such as `*(#qN)`.
  - [x] Parse bracket glob and character class patterns such as `foo[abc].zsh`, `[[:alpha:]]`, and numeric range globs like `<->`.
  - [x] Parse richer glob qualifier variants beyond `*(.)` and `*(#qN)`.
- [ ] Exhaustive parameter expansion semantics
  - [x] Parse default/alternate/error operators such as `:-`, `:=`, `:?`, `:+`.
  - [x] Parse prefix/suffix removal operators `#`, `##`, `%`, `%%`.
  - [x] Parse simple substitution and offset/length forms covered by current fixtures.
  - [x] Parse substitution variants such as `${var//pat/repl}`, `${var/#pat/repl}`, and `${var/%pat/repl}`.
  - [x] Leave expansion transformation semantics to runtime.
- [x] Alternate/short command forms
  - [x] Parse `while list { list }`.
  - [x] Parse short `for` and short `select` forms.
  - [x] Parse short `function` bodies.
- [x] Option/emulation-sensitive zsh parsing
  - [x] Parse common `emulate`, `setopt`, and `unsetopt` forms in fixtures.
  - [x] Accept syntax variants commonly seen under option-sensitive usage.
  - [x] Do not model runtime option state in the static grammar.
- [x] Broader real-world `.zshrc` compatibility testing
  - [x] Add a representative `.zshrc`-style corpus fixture.
  - [x] Include aliases, exports, `autoload -Uz`, `zstyle`, `bindkey`, `[[ ... ]]`, and parameter expansion.
  - [x] Add more fixtures as real-world failures are discovered.
