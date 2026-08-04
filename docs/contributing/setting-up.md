# Setting Up

## Visual Studio Code development container

The easiest way to get started is to use VSCode development containers, which will create a development environment pre-configured with all dependencies and extensions installed and dependent services running.

1. [Follow the instructions](https://code.visualstudio.com/docs/devcontainers/tutorial) to set up VSCode with the dev containers extension.
2. In VSCode, open the Command Palette and select **Clone Repository in Container volume...*
3. Point it to this repo
4. If prompted, trust the workspace files

VSCode will pull down the repo, create the necessary Docker containers, start up all the services, and open the frontend code for development. To start debugging, simply press **F5**.

## Preliminary preparation

To set up development without using development containers, follow these steps.

### Node.JS

1. Install Node.JS following this guide: `https://nodejs.org/en/download` (for Windows use Linux instead as platform since you need to be using WSL. You can install it for Windows if you use prebuilt image)
2. Install Yarn `npm i -g yarn` or `sudo npm i -g yarn`

## Windows

Developing on Windows inside WSL is not recommended. Use the VSCode devcontainer method instead for better performance and simpler configuration.

1. Install WSL 2.0. There is no other way for you
2. Install Docker Desktop
3. `git clone` project INSIDE of WSL. For example, create root folder named `/Projects` with proper permissions
   - Tip: use Windows Terminal from MS Store instead of default WSL terminal

### Linux

Make sure Docker is installed, otherwise you are good. Clone project whenever you want.

### MacOS

1. Install Docker Desktop
2. Running on ARM? In Docker Settings enable Virtual Machine Manager and VirtioFS for speed boosts
3. `git clone` project anywhere you want

## IDE

I prefer to work on WebStorm, but VS Code works just fine - just make sure to install all plugins needed (TS, Vue, Eslint, etc) and choose ESLint as your file formatter.

Also, later on, enable eslint and stylelint autofixes for better development.

Please do not use vim to develop this project.

## Getting it done

1. Copy `.env.example` to `.env` with no changes
2. **Working on Mac ARM64**? Run `docker compose -f docker-compose.yml -f docker-compose.arm64.yml build`. Others skip this step
3. Run `docker compose up`
4. Visit `localhost:8080` in a few minutes. You should now be ready to do it

## Worth knowing

Hot Reload is not working for data-worker and navigraph.

Making this simple: if you make changes for those files, you would have to restart containers that belong to them for changes to apply.

Changes made in Vue files or just main code will be auto-applied.
