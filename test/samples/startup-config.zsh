# Representative zsh startup configuration sample.
# Sources:
# - https://zsh.sourceforge.io/Doc/Release/Shell-Grammar.html
# - https://context7.com/ohmyzsh/ohmyzsh

export ZSH="${ZDOTDIR:-$HOME}/.oh-my-zsh"
plugins=(git zsh-autosuggestions zsh-syntax-highlighting)
fpath=("$ZDOTDIR/functions" $fpath)

autoload -Uz compinit promptinit add-zsh-hook
zstyle ':omz:update' mode auto
zstyle ':omz:update' frequency 7
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Z}'
zstyle ':completion:*:descriptions' format '%F{yellow}-- %d --%f'

if [[ -n $ZDOTDIR && -f ${ZDOTDIR:-$HOME}/.zshrc.local ]]; then
  source ${ZDOTDIR:-$HOME}/.zshrc.local
fi

for plugin in $plugins; do
  [[ -n $plugin ]] && print -r -- "loading $plugin"
done

eval "$(zoxide init zsh)"
