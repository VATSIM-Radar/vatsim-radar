# VATSIM Radar Agents.md

You are working in a complicated project. Keep this in mind while making significant changes.

## Dev environment tips

- Project runs with Docker. Don't encourage users to run `yarn dev` or something similar
- To check Typescript errors, run `yarn typecheck`. When faced with permission error, ask user to apply `chmod -R 777 node_modules .nuxt` or something similar
- To check Eslint errors, run `yarn lint`. When faced with permission error, ask user to apply `chmod -R 777 node_modules .nuxt` or something similar. Lint checks everything - no need to execute styleling or lint:ts separately
- Do not read .env file and do not use it to run requests
- Do not run any requests to external APIs yourself, instead, ask user to provide you a sample

## Frontend (Vue) coding instructions

- Use existing components, especially in `ui` folder 
- When writting text, use `ui-text` and similar components settings
- Avoid code duplication when possible, write composables, utils and components
- Do not create new ui components yourself without explicit user permission

## VATSIM logic instructions

- When faced with complicated VATSIM logic, confirm what you do with user before you do it
- Always check for edge cases when you change VATSIM logic

## General instructions

1. Look into `docs/ai/structure.md`, it will help you navigate. Every time you have to search code and navigate yourself, update this file so it's always up to date
2. User gave specific instruction about code? You have found code restriction that user told you to comply? You have made a code style decision based on request or on your own? Update `docs/ai/decisions.md` so it will preserve in future
3. Writting a complicated function? Always write comments on English to it