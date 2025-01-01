# VATSIM Radar

Main website: https://vatsim-radar.com

Want to change displayed airlines? Visit https://github.com/VATSIM-Radar/data

Want to get project up and running?

1. Clone project (into WSL if you're on windows)
2. Copy contents of `.env.example` inside `.env`
3. Run `docker compose build` (`docker compose build -f docker-compose.yml -f docker-compose.arm64.yml` for mac)
4. Run `docker compose up`
5. Project should be up and running on localhost:8080
