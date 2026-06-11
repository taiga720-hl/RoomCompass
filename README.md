# RoomCompass

RoomCompass is a web app for registering rental candidates and comparing them with weighted scoring.

## Features

- Register properties with name, address, rent, area, and station walking time
- View all registered properties in a list
- Compare selected properties with adjustable weights
- Auto-rank by total score and highlight the top result

## Tech Stack

- Frontend: Next.js (App Router), TypeScript, Tailwind CSS
- Backend: FastAPI, SQLAlchemy
- Database: PostgreSQL
- Cache: Redis
- Infra: Docker Compose

## Quick Start

1. Start services:

```bash
docker compose up --build
```

2. Open apps:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## Main Pages

- Home: `/`
- Main Menu: `/main`
- Create Property: `/properties/create`
- Property List: `/properties`
- Compare: `/compare`

## Notes

- Frontend-specific notes are in `frontend/README.md`.
