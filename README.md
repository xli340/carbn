# Carbn Fleet Demo (Technical Task)

This is a React-based vehicle rental and tracking demonstration application. It was built to complete the Carbn Technical Task. To make the interaction experience more natural and realistic, I designed it as a **Car Rental App** scenario.

🔗 **Live Demo**: [https://carbn-sigma.vercel.app](https://carbn-sigma.vercel.app)

> **Note**: If the map fails to load in the online version, it may be due to restrictions or quota limits on the demo Google Maps API Key. It is recommended to follow the [Local Setup Guide](#-local-setup-guide) below to run it locally.

## 📖 Table of Contents

- [Background & Task](#-background--task)
- [Task Completion](#-task-completion)
- [Core Features](#-core-features)
- [Assumptions & Design Decisions](#-assumptions--design-decisions)
- [Local Setup Guide](#-local-setup-guide)
- [Project Structure](#-project-structure)
- [Tech Stack](#-tech-stack)
- [Key Code Highlights](#-key-code-highlights)
- [Future Improvements](#-future-improvements)
- [Acknowledgments](#-acknowledgments)

-----

## 📝 Background & Task

This application aims to demonstrate how to track vehicle positions in real-time on a map, view vehicle details, and replay historical tracks. In this demo, the user acts as a customer looking to rent a car or a fleet manager who can view available vehicles on the map, simulate the rental process, and view the vehicle's historical travel records.

-----

## ✅ Task Completion

Based on the challenge requirements in the email, this project implements the following features:

### 1\. Map View - Display vehicles on a map

  - Upon logging in, the main interface presents a full-screen map displaying vehicles within the New Zealand region.
  - Utilizes `@vis.gl/react-google-maps` for map rendering and supports Clustering to optimize the display of large numbers of vehicles.

### 2\. Vehicle Selection - Click a vehicle to select it, and show vehicle details

  - Clicking a vehicle icon on the map opens an InfoWindow displaying vehicle details (speed, heading, last updated time, ignition status).
  - Upon selection, the map automatically pans to focus on the vehicle.

### 3\. Track History - Show selected vehicle's historical path

  - **Multiple Entry Points**: Accessible via the "History" button in the map info card or by clicking an item in the "Historical Tracks" list on the right.
  - **Custom Time Range**: Supports quick presets (e.g., 1h, 24h) or custom start/end times.
  - **Dual Mode Display**:
    1.  **Static Mode**: Draws the complete Polyline path directly on the map, marking the start and end points.
    2.  **Animation Mode**: Smoothly replays the vehicle's movement from start to finish using interpolation algorithms. Supports **speed up, slow down, pause, replay**, and progress bar dragging.

### 4\. Real-Time Updates - Use WebSocket for live position updates\!

  - Integrated WebSocket connection (`/api/v1/fleet/live`).
  - Vehicle position, speed, and heading on the map update in real-time based on backend push data without requiring a page refresh.

-----

## ✨ Core Features

### 🔐 Authentication

  * **Auto-fill**: For testing convenience, the login page pre-fills valid test credentials.
  * **State Management**: Displays user avatar and email upon successful login, with logout functionality.
  * **Token Handling**: JWT Token is used for API request authentication; auto-redirects to login page upon expiration.

### 🗺️ Map Interaction

  * **Status Visualization**:
      * ⚫ **Black Icon**: Ignition Off, indicating the vehicle is idle and **available for rent**.
      * 🔴 **Red Icon**: Ignition On, indicating the vehicle is currently driving and unavailable.
      * 🟡 **Yellow Icon**: Indicates an Active Trip currently being simulated by the user.
  * **Real-time Sync**: Vehicle positions animate live when the WebSocket connection is active.

### 🚗 Booking Simulation

  * Click "Book" in the vehicle info card to select a rental time range.
  * The system calculates an estimated quote based on duration and configured rates (Base Fare + Hourly Rate + Energy Fee).
  * Upon confirmation, the vehicle status updates to "Active Trip" on the frontend, the map isolates the vehicle's track, and the trip simulation begins.

### 📜 Advanced Playback (History)

  * **Interpolation Animation**: To solve jumpiness between historical track points, the frontend implements interpolation algorithms. This ensures smooth movement during playback and automatically calculates the vehicle's heading based on the angle between two points.
  * **Playback Controls**: Provides full player controls (Play/Pause/Speed/Exit).

### 🎨 UI/UX

  * **Responsive Design**: Perfectly adapted for both desktop and mobile screens.
  * **Theme Switching**: Supports Light/Dark mode toggling.
  * **Interaction Details**: Includes list pagination, loading states, error prompts, etc.

-----

## 🤔 Assumptions & Design Decisions

To ensure a logical and closed-loop application flow, I made the following assumptions during development:

1.  **Account System**: Assumes the user is already registered. To facilitate review, valid credentials are pre-filled on the login page. Changing them to invalid ones will trigger an error.
2.  **Order State Mapping**: In the "Historical Tracks" list, I use the vehicle's `ignition_on` status to simulate whether an order is "In Progress". This might result in multiple vehicles showing as driving simultaneously (consistent with a fleet manager view).
3.  **API Reuse**: Due to the limited API endpoints provided, the map display and the historical list use the same `fetchVehiclesWithinBounds` data source.
      * *Note*: In production, "Available for Rent" and "Map Viewport Vehicles" would likely be separate APIs. Currently, zooming the map changes the data in the right-hand list, which is expected behavior.
4.  **Trip Simulation (Mock)**: The flow after clicking "Book" is a pure frontend state simulation (since there is no backend Booking API). Once a trip starts, viewing other historical orders is restricted until "End Trip" is clicked to prevent state confusion.
5.  **Token Expiry**: The current token has a short validity period. I implemented an interceptor that automatically logs out and redirects to the login page when the API returns a 401 error.

-----

## 💻 Local Setup Guide

1.  **Clone the project**

    ```bash
    git clone <repo-url>
    cd carbn
    ```

2.  **Configure Environment Variables**
    Copy `.env.example` to `.env`:

    ```bash
    cp .env.example .env
    ```

    **Critical Step**: Please enter a valid `VITE_GOOGLE_MAPS_API_KEY` in the `.env` file.
    *(Other API URL configurations are pre-set to the Dev environment and do not need changing)*

3.  **Install Dependencies**

    ```bash
    npm install
    ```

4.  **Run Development Server**

    ```bash
    npm run dev
    ```

    Open the address shown in the terminal (usually `http://localhost:5173`) in your browser.

-----

## 🏗️ Project Structure

The project follows a Feature-based directory structure for better maintenance and scalability:

```text
src/
├── app/                # Global Provider configuration
├── components/         # Generic UI components (Shadcn UI)
├── config/             # Environment variables and global config
├── features/           # Core business modules
│   ├── auth/           # Authentication module (API, Store)
│   └── vehicles/       # Vehicle module
│       ├── api/        # Vehicle-related API requests
│       ├── components/ # Vehicle components (Map, List, Marker, Playback...)
│       ├── hooks/      # Custom Hooks (Animation, WebSocket, Queries)
│       ├── stores/     # Zustand state management
│       └── utils/      # Utility functions (Icon generation, Pricing logic)
├── hooks/              # Generic Hooks (useTheme)
├── lib/                # Base library wrappers (Axios/Fetch, WebSocket, Utils)
├── pages/              # Route pages (LoginPage, VehicleMapPage)
└── routes/             # Route definitions and protection (ProtectedRoute)
```

-----

## 🛠️ Tech Stack

  * **Core**: React 19, TypeScript, Vite
  * **State Management**: Zustand (Global State), TanStack Query (Server State/Caching)
  * **UI Framework**: Tailwind CSS, Shadcn UI (based on Radix UI), Lucide React (Icons)
  * **Maps**: `@vis.gl/react-google-maps` (Google Maps Platform)
  * **Linting**: ESLint, Prettier

-----

## 💡 Key Code Highlights

1.  **WebSocket Real-time Updates (`useLiveVehicleUpdates.ts`)**

      * Encapsulates WebSocket connection management with auto-reconnect support.
      * Updates the React Query cache directly via `queryClient.setQueryData`, achieving seamless real-time data refreshing without frequent API polling.

2.  **Trajectory Animation Logic (`useVehicleAnimation.ts`)**

      * The core Hook. It converts discrete track points into a continuous animation.
      * Implements time-based linear interpolation to calculate latitude, longitude, and heading between two points, using `requestAnimationFrame` to ensure animation smoothness.

3.  **High-Performance Markers (`VehicleMarker.tsx`)**

      * Implements automatic fallback based on API Key configuration. If a Map ID is valid, it prioritizes Google Maps `AdvancedMarker` (better performance, supports HTML/CSS styling); otherwise, it falls back to the traditional `Marker`.

-----

## 🚀 Future Improvements

If this were a production project, I would consider the following enhancements:

  * **Real Booking Flow**: Integrate with a backend Booking API to handle payments and order state transitions.
  * **Precise Vehicle States**: Distinguish between "Idle", "Booked", "Maintenance", and other states.
  * **Geofencing**: Draw return zones on the map.
  * **Unit & E2E Testing**: Add Jest and Cypress test cases to ensure core flow stability.
  * **Performance Optimization**: For massive fleets (10,000+ vehicles), consider using WebGL layers or Deck.gl for rendering.

-----

## ❤️ Acknowledgments

Thank you very much for your time and this opportunity\!

  * **Maxamillian Shields**
  * **Dave Corbett**
  * **Kerry Ellis**

I look forward to hearing your feedback\!
