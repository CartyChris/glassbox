# GlassBox cloud terminal: the GlassBox bridge in remote mode (token required) plus the coding CLIs it drives.
# Used by GitHub Codespaces (.devcontainer) and by any Docker host:
#   docker build -f cloud/Dockerfile -t glassbox-cloud .
#   docker run -p 8791:8791 glassbox-cloud          # prints the pairing code; or pass -e GLASSBOX_TOKEN=...
FROM node:24-bookworm
ENV DEBIAN_FRONTEND=noninteractive \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    BUN_INSTALL=/usr/local/bun \
    PATH=/usr/local/bun/bin:$PATH
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pip python3-venv pipx git curl ca-certificates ripgrep jq unzip procps less sudo \
    && rm -rf /var/lib/apt/lists/*
# Cloudflare quick tunnels (free, no account) for a public URL when not on Codespaces.
RUN arch="$(dpkg --print-architecture)" \
    && curl -fsSL -o /tmp/cf.deb "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${arch}.deb" \
    && dpkg -i /tmp/cf.deb && rm /tmp/cf.deb
# The coding harnesses GlassBox's Terminal, Harness Hub, Harness² and REA drive, and Playwright for the headless gauntlet.
RUN npm install -g @anthropic-ai/claude-code @openai/codex opencode-ai @google/gemini-cli rea-agents playwright@1 \
    && npm cache clean --force
# Oh My Pi runs on Bun.
RUN curl -fsSL https://bun.sh/install | bash && bun add -g @oh-my-pi/pi-coding-agent && chmod -R a+rX /usr/local/bun
RUN npx -y playwright@1 install --with-deps chromium && chmod -R a+rX /ms-playwright
COPY glassbox-bridge.mjs GlassBox.html /opt/glassbox/
COPY cloud/start-bridge.sh /opt/glassbox/cloud/start-bridge.sh
COPY tools/run-gauntlet.mjs /opt/glassbox/tools/run-gauntlet.mjs
RUN printf '#!/bin/sh\ncat "$HOME/.glassbox/pair-code" 2>/dev/null || echo "no code yet — is the bridge running?"\n' > /usr/local/bin/glassbox-code \
    && chmod +x /usr/local/bin/glassbox-code
USER node
WORKDIR /home/node
ENV GLASSBOX_REMOTE=1 GLASSBOX_BRIDGE_PORT=8791
EXPOSE 8791
CMD ["bash", "/opt/glassbox/cloud/start-bridge.sh"]
