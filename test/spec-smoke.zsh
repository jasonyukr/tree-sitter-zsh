{ print try } always { print always }

foo bar () { print shared }

foo bar () print shared

time

for x in a b; { print $x }

for ((i=0; i<2; i++)) { print $i }

select x in a b; { print $x; break }

coproc cat |& sed 's/x/y/'

noglob print *.zsh

- echo login-shell-command

for x y in a b c d; do print $x $y; done

case $x in (a|b) print ab ;; (c) print c ;& (*) print star ;| esac

foreach x (a b) { print $x }

repeat 2 { print hi }

[[ -v path[1] && -n ${name:-default} ]]

[[ $file == (#i)*.zsh ]]

print ${name:-${fallback}}

print ${(@kv)parameters[(I)PATH]}

print ${var//(#m)[[:alpha:]]/${MATCH:l}}

print foo[[:alpha:]](#qN)

print **/*.zsh(D.)

print hi >&$myfd

>out
