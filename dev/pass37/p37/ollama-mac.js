  /* macOS — two traps measured on a real Mac: the hidden menu-bar app IGNORES "quit app Ollama" and respawns
     `ollama serve` with the environment it started with, and a terminal `ollama serve` is a SECOND server (IPv4)
     beside the app's (IPv6) that never sees launchctl. So: add this site to OLLAMA_ORIGINS (never overwrite, a "*"
     already covers it), save a login item that re-applies it after a restart — and restarts Ollama if it came up
     first and still refuses the site — then stop BOTH servers hard, reopen the app and check with this site's Origin. */
  const q1=l=>"'"+l.replace(/'/g,"'\\''")+"'";
  const agent=`"launchctl setenv OLLAMA_ORIGINS '$new'" 'sleep 20' `+
    q1(`[ "$(curl -s -o /dev/null -w '%{http_code}' -H 'Origin: ${o}' ${check})" = 403 ] && { pkill -x Ollama; pkill -x ollama; sleep 2; open -a Ollama; }`)+` 'exit 0'`;
  return{label:'macOS',shell:'Terminal',
    now:`cur="$(launchctl getenv OLLAMA_ORIGINS)"; case ",$cur," in *",${o},"*|*",*,"*) new="$cur";; *) new="\${cur:+$cur,}${o}";; esac; launchctl setenv OLLAMA_ORIGINS "$new"; `+
      `mkdir -p ~/.glassbox ~/Library/LaunchAgents; S=~/.glassbox/ollama-origins.sh; P=~/Library/LaunchAgents/com.glassbox.ollama-origins; printf '%s\\n' ${agent} > "$S"; `+
      `launchctl unload "$P.plist" 2>/dev/null; rm -f "$P.plist"; defaults write "$P" Label com.glassbox.ollama-origins; defaults write "$P" RunAtLoad -bool true; defaults write "$P" ProgramArguments -array /bin/sh "$S"; launchctl load -w "$P.plist" 2>/dev/null; `+
      `pkill -x Ollama 2>/dev/null; pkill -x ollama 2>/dev/null; (command -v brew >/dev/null && brew services list 2>/dev/null | grep -q "^ollama.*started" && brew services restart ollama >/dev/null); sleep 2; open -a Ollama 2>/dev/null; `+
      `for i in $(seq 1 20); do sleep 1; curl -s -o /dev/null -H "Origin: ${o}" ${check} && break; done; curl -s -o /dev/null -w "HTTP %{http_code}  (200 = connected)\\n" -H "Origin: ${o}" ${check}`,
    permanent:'',permanentWhy:'',
    undo:`launchctl unload ~/Library/LaunchAgents/com.glassbox.ollama-origins.plist 2>/dev/null; rm -f ~/Library/LaunchAgents/com.glassbox.ollama-origins.plist ~/.glassbox/ollama-origins.sh; launchctl unsetenv OLLAMA_ORIGINS`};
}
