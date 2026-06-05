# Representative plugin/helper syntax sample.
# Sources:
# - https://zsh.sourceforge.io/Doc/Release/Shell-Grammar.html
# - https://zsh.sourceforge.io/Doc/Release/Expansion.html

function -T _sample_widget {
  emulate -L zsh
  local -a matches
  matches=(${(@f)$(print -r -- "$BUFFER")})
  print -r -- ${matches[1]:-empty}
}

sample-paths() {
  print -r -- **/*.zsh(D.)
  print -r -- foo[[:alpha:]](#qN)
}

foreach name (alpha beta gamma) {
  print -r -- ${name:u}
}

repeat 2 {
  print -r -- ${${:-fallback}:l}
}

{
  print -r -- "try"
} always {
  (( TRY_BLOCK_ERROR = 0 ))
}
