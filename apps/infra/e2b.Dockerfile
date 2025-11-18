
# Use Ubuntu 22.04 as the base image
# FROM ubuntu:22.04
# e2bdev/code-interpreter has most of the packages installed
# For more information, see: https://github.com/e2b-dev/code-interpreter/blob/main/template/Dockerfile
FROM e2bdev/code-interpreter:latest

# Install curl and git, update package list
# RUN apt-get update && apt-get install -y curl git

# Install Node.js 24.x
# RUN curl -sL https://deb.nodesource.com/setup_24.x | bash - && apt-get install -y nodejs

# Confirm installations
# RUN node -v && npm -v && git --version

# Experimental: Use srt for a more secure sandbox runtime
RUN npm install -g @anthropic-ai/sandbox-runtime@latest

# Install agents
# Make sure to use pinned versions for agents, otherwise you may get unexpected behavior
# RUN npm install -g @openai/codex@latest
# RUN npm install -g @google/gemini-cli@latest
RUN npm install -g @anthropic-ai/claude-code@2.0.45
# RUN npm install -g @sourcegraph/amp@latest

# Set the default command
CMD ["/bin/bash"]