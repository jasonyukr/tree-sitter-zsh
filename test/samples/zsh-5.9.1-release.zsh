# Samples from zsh 5.9.1 release notes and release announcement.
# Sources:
# - https://www.zsh.org/mla/announce/msg00135.html
# - https://zsh.sourceforge.io/releases.html

kill -q 5 -RTMIN+1 $$
kill -L

TRAPRTMIN() {
  print -r -- "signal handled"
}

print ${(-)versions}
print ${(*)sample/(#b)*(pat)*/${match[1]}}

zstyle ':foo:bar:*:*' style value1
zstyle ':foo:*:baz:*' style value2

region_highlight+=("0 20 bold memo=sample")

typeset pending
unset 'hash[ab]cd]'
