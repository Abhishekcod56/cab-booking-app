# CabGo – Cab Booking Application

## 1. Introduction

CabGo is a cab-booking web application built to bring ride booking and management into one web interface. Riders can enter pickup and destination locations, request an estimated fare, submit a booking, and review their bookings. The project also includes driver applications, administrator approval controls, and ride-tracking functionality.

### Project goals
- Make pickup and destination entry straightforward.
- Estimate route distance and fare.
- Support sign-in and booking management.
- Support driver applications and administrator approval.
- Show booking and driver-location details where available.

> **Project status:** Only describe features as production-ready after testing them in the deployed application.

## 2. Research and Problem Understanding

A cab-booking application brings together several connected tasks: authentication, location selection, route and fare estimation, booking storage, driver management, and booking-status visibility.

CabGo combines these tasks in one application. It uses map and routing services to support location-related features, Supabase for application data, Clerk for authentication, and Stripe for payment-related integration.

### Requirements considered
- **Usable booking flow:** Riders should be able to enter pickup and destination details using location names.
- **Location support:** Geographic coordinates can help identify map locations and calculate routes.
- **Fare estimation:** Route-distance estimates can be used to calculate an indicative fare.
- **Authentication and roles:** Rider, driver, and administrator functionality require appropriate access checks.
- **Driver approval:** Driver applications should be reviewed before approved-driver features are enabled.
- **Booking visibility:** Users need a way to review bookings and relevant trip-location information.
- **Security:** Secret keys belong in environment variables, and privileged API routes must check authorization.

This section describes design considerations; it does not claim that formal user research or a production-scale study has been conducted.

## 3. Technology Stack and Why It Was Chosen

| Technology | Role in CabGo | Reason for using it |
|---|---|---|
| JavaScript | Application language | Keeps the project in JavaScript rather than TypeScript and supports quick iteration. |
| Next.js | Full-stack React framework | Supports pages, UI components, and server-side API routes in one project. |
| React | User interface | Builds reusable, interactive interface components. |
| Tailwind CSS | Styling | Supports responsive styling with utility classes. |
| Clerk | Authentication | Provides sign-in, sign-up, and authenticated user identity. |
| Supabase | Database and data access | Stores booking and driver-profile records in PostgreSQL. |
| OpenStreetMap | Map data | Provides open map data for location-oriented features. |
| Leaflet | Interactive maps | Displays maps and supports browser-based map interaction. |
| Nominatim | Geocoding | Helps resolve location names into geographic coordinates. |
| OSRM | Route calculation | Calculates road routes and route distances from coordinates. |
| Stripe | Payment integration | Provides payment infrastructure; live payments must be configured and tested separately. |
| Git and GitHub | Version control | Tracks changes and hosts the project repository. |

### Application architecture at a glance
1. The browser displays the Next.js/React interface.
2. Clerk identifies the signed-in user.
3. Next.js API routes validate requests and apply access checks.
4. Supabase stores application records.
5. Map, geocoding, and routing services support location and fare features.
6. Stripe can support payment flows when its keys, account settings, and payment routes are configured.

## 4. Conclusion

CabGo is a full-stack learning project that brings together a cab-booking interface, authentication, database operations, location and routing features, driver applications, approval controls, and ride tracking. Its modular structure provides a foundation for improving the booking experience and expanding functionality.

Before production deployment, test the complete user flows, configure environment variables securely, restrict administrator access, review database policies and API authorization, and test payment processing in the appropriate Stripe environment.

## Local Development

### Prerequisites
- Node.js compatible with the project's Next.js version
- npm
- A Supabase project
- Clerk application credentials
- Required map/routing and Stripe configuration

### Setup
1. Clone the repository.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a local `.env.local` file and add the required environment variables. Obtain values from the service dashboards; do not commit this file.
4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

Check `package.json` for the exact scripts and confirm environment-variable names from the project code.

## Security Notes

- Never commit `.env.local`, private keys, Supabase service-role keys, Stripe secret keys, or other credentials.
- Set production secrets in your deployment provider's environment-variable settings.
- Restrict administrator endpoints and verify authorization on the server.
- Use test data in documentation.
