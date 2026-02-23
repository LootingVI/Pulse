# 📄 API Documentation

The Antigravity Uptime API follows REST principles and returns JSON responses.

## 🔐 Authentication
All dashboard routes require a valid session or JWT. Use the standard `/api/auth` endpoint for login.

## 📡 Endpoints

### Monitors
- `GET /api/monitors`: List all monitors for the current user.
- `POST /api/monitors`: Create a new monitor.
  - Body: `{ name, type, target, interval, port?, keyword? }`
- `GET /api/monitors/:id`: Get details for a specific monitor.
- `PUT /api/monitors/:id`: Update a monitor.
- `DELETE /api/monitors/:id`: Delete a monitor.

### Status Pages
- `GET /api/status/:slug`: (Public) Get status data for a public status page.
- `POST /api/status-pages`: Create a new status page.
- `PUT /api/status-pages/:id`: Update configuration.

### Incidents
- `GET /api/incidents`: List active incidents.
- `POST /api/incidents/:id/updates`: Add a message to an incident.

## 📊 Status Codes
- `200 OK`: Request successful.
- `201 Created`: Resource created successfully.
- `400 Bad Request`: Invalid parameters.
- `401 Unauthorized`: Authentication required.
- `404 Not Found`: Resource not found.
- `500 Internal Server Error`: Something went wrong on our side.
