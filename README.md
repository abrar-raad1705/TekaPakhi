# TekaPakhi - Mobile Financial Services (MFS) Platform

TekaPakhi is a robust Mobile Financial Services platform built with the PERN (PostgreSQL, Express, React, Node.js) stack. It aims to provide secure and efficient financial transactions for Customers, Agents, and Merchants.

## 🚀 Features

- **Multi-user Support**: Specialized account types for Customers, Agents, and Merchants.
- **Secure Authentication**: PIN-based login with OTP verification for registration and PIN resets.
- **Role-based Access**: Different capabilities and dashboards based on user type.
- **KYC Workflow**: Admin approval process for Agents and Merchants.
- **Real-time Transactions**: Secure money transfer, cash-in, cash-out, and payment functionalities.

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Headless UI, Heroicons, Framer Motion.
- **Backend**: Node.js, Express.js.
- **Database**: PostgreSQL (pg pool).
- **Validation**: Zod.
- **Security**: JWT (Access Tokens), Bcrypt (PIN hashing), CORS, Express Rate Limit.

## 🏁 Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL (v14+)
- npm or yarn

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd TekaPakhi
   ```

2. **Install dependencies for both client and server**:
   From the root directory, run:
   ```bash
   npm run install:all
   ```

3. **Set up Environment Variables**:
   - In the `server` directory, copy `.env.example` to `.env` and fill in your database credentials and secrets.
   - In the `client` directory, copy `.env.example` to `.env` and set the `VITE_API_URL`.

4. **Initialize Database**:
   - Create a database named `tekapakhi_db`.
   - Run the initial migration script located in `migrations/tp.sql`. (Note: Ensure your `migrations` folder is up to date).

### Running the Application

You can run both client and server from the root directory:

- **Start API Server**: `npm run server:dev`
- **Start Client App**: `npm run client`

## 📁 Project Structure

```text
TekaPakhi/
├── client/          # Vite + React Frontend
│   ├── src/
│   │   ├── api/     # API Integration
│   │   ├── components/
│   │   └── pages/
├── server/          # Express Backend
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   └── services/
└── migrations/      # Database SQL scripts
```

## 📜 License

This project is licensed under the ISC License.
