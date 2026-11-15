# GearBuddy

GearBuddy helps drivers describe vehicle problems, find nearby auto repair shops, and request appointments.

## Project overview

Finding the right repair service can be difficult when a driver is unsure what is wrong with their vehicle. GearBuddy combines an AI troubleshooting assistant with local shop search and appointment management.

## Technology

- Frontend: React.js and Vite
- Backend: Node.js and Express
- Database: MongoDB with Mongoose
- AI: Google Gemini through the `@google/genai` SDK
- Shop listings: OpenStreetMap services

## Features

- Create an account, sign in, and sign out
- Ask GearBuddy about vehicle symptoms and receive service suggestions
- Search OpenStreetMap listings for nearby repair shops
- View service information
- Request, view, reschedule, and cancel appointments
- Store user and appointment data in MongoDB

Shop listing details may be incomplete or out of date. Contact a repair shop to confirm its services, pricing, and availability before visiting.

## Project structure

```text
Capstone_Project/
├── backend/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── server.js
└── frontend/
    ├── public/
    └── src/