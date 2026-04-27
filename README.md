# tree-sitter-zsh

`tree-sitter-zsh` is an MVP Tree-sitter grammar package for zsh source files and startup files.

The grammar is intentionally pragmatic and conservative. It targets common interactive and configuration-file syntax, including commands, assignments, redirects, pipelines, lists, command substitution, functions, blocks, subshells, and standard shell control forms. It also includes zsh-specific coverage for `repeat`, `foreach ... end`, `coproc`, `nocorrect`, process substitution, parameter flag expansion such as `${(@f)$(cmd)}`, heredocs, arithmetic forms, `[[ ... ]]` conditionals, glob qualifiers, parameter expansion forms, and `.zshrc`-style fixtures.

This is not a complete zsh specification implementation. The grammar now includes broad syntax coverage for the completed tranche, while full zsh/spec coverage and runtime semantics such as option state, glob matching, arithmetic evaluation, and exhaustive parameter-expansion behavior remain incomplete and out of scope for the parser.

## Development

```sh
npm install
npm run generate
npm test
```

## Neovim

This grammar can be used as a local parser in Neovim or nvim-treesitter by pointing the parser configuration at this repository and associating it with the `zsh` filetype. Typical zsh startup files such as `.zshrc`, `.zprofile`, `.zlogin`, `.zlogout`, and `.zshenv` should be associated with the `zsh` filetype by the editor.

## License

MIT
