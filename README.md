# TekaPakhi: A Scalable Financial Ecosystem & Transaction Management System

**Academic Project**: CSE-216 (Database Management System Sessional)  
**Semester**: Year 2, Semester 1  
**Authors**: 
- [Abrar Ryan](https://github.com/abrar-raad1705)
- [Md. Shihabul Hasan](https://github.com/Shibooo169)
---

## 1. Project Abstract
TekaPakhi is a high-fidelity digital banking and financial ecosystem designed to simulate modern mobile financial services (MFS). The system implements a robust, double-entry accounting architecture powered by a PostgreSQL relational database. It facilitates multi-role financial interactions (Customer, Agent, Merchant, Biller, and Distributor) while ensuring absolute data integrity, ACID compliance, and policy-driven commission distributions.

The core of the system lies in its sophisticated **stored procedure-driven transaction engine**, which ensures that every financial movement—regardless of complexity—is atomic, consistent, and fully auditable.

---

## 2. Relational Database Design
The database is architected to prioritize scalability and normalization (3NF/BCNF) while maintaining efficient query performance.

### 2.1 Schema Inheritance & Profile Management
The project utilizes a **Supertype/Subtype (Table-per-Subtype)** pattern for profile management:
- **`profiles`**: A base table containing core authentication data, contact details, and account status.
- **Sub-profiles**: `customer_profiles`, `agent_profiles`, `merchant_profiles`, `distributor_profiles`, and `biller_profiles` extend the base profile with role-specific attributes (e.g., Shop Name for Agents, Service Name for Billers) using shared primary keys.

### 2.2 Financial Integrity & The Ledger System
Financial soundness is maintained through a decoupled Wallet-Ledger architecture:
- **Wallets**: Each profile is linked to a primary wallet. System-level roles (TREASURY, REVENUE, ADJUSTMENT) exist to facilitate settlement and fee accumulation.
- **Double-Entry Ledger (`ledger_entries`)**: Every transaction generates at least two immutable ledger records (Debit & Credit). This ensures that the total sum of balances in the ecosystem is always reconcilable.

### 2.3 Enumerations & Domain Constraints
Strict domain integrity is enforced via PostgreSQL `ENUM` types:
- `profile_status`: `ACTIVE`, `SUSPENDED`, `PENDING_KYC`, `BLOCKED`.
- `transaction_status`: `PENDING`, `COMPLETED`, `FAILED`, `REVERSED`.
- `wallet_role`: `TREASURY`, `REVENUE`, `ADJUSTMENT`.

---

## 3. Transaction Logic & Business Rules
The most critical logic is offloaded to the database layer (In-DB Processing) to guarantee ACID properties.

### 3.1 The `sp_execute_transaction` Procedure
A centralized PL/pgSQL procedure handles all transaction types (Cash-In, Cash-Out, Pay Bill, etc.). Its lifecycle includes:
1.  **Validation**: Verifies account statuses, daily/monthly transaction limits, and minimum/maximum amount constraints.
2.  **Locking**: Implements **Row-Level Locking** (`FOR UPDATE`) in a deterministic order to prevent deadlocks and race conditions.
3.  **Revenue & Fees**: Automatically calculates fees based on the `transaction_types` policy and directs them to the system Revenue wallet.
4.  **Commission Engine**: Dynamically calculates and distributes shares to Agents, Distributors, and the System based on `commission_policies`.
5.  **Settlement**: Bridges the gap between internal user balances and the system Treasury.

### 3.2 Automated Integrity Triggers
The project employs complex triggers to enforce security and business invariants:
- **Immutability**: Transactions and ledger entries are made immutable post-execution.
- **Anti-Tamper**: A privacy trigger prevents any manual `UPDATE` or `DELETE` on financial tables if the operation originates outside the application logic.
- **Limit Enforcement**: Real-time balance checks and max-balance guards prevent accounts from exceeding regulatory limits.

---

## 4. Key Functional Features
- **Multi-Role Dashboards**: Custom interfaces for Customers (Payments), Agents (Cash-outs), and Merchants (Collection).
- **Automated OTP System**: Time-sensitive verification for phone verification and secure PIN resets.
- **Dynamic Commissioning**: Tiered commission payouts for network stakeholders (Distributors/Agents).
- **Audit Trails**: Extensive logging of administrative and security events.
- **Real-time Analytics**: Rechart-based visualization of financial trends and transaction history.

---

## 5. Technology Stack
### Backend (Engine)
- **Node.js & Express**: API gateway and business logic orchestration.
- **PostgreSQL**: Primary relational engine (using complex Joins, Procedures, Triggers, and Indexes).
- **JWT & Bcrypt**: Secure token-based authentication and PIN hashing.

### Frontend (Interface)
- **React 18**: Component-based UI architecture.
- **Vite**: High-performance build tool.
- **Framer Motion**: Premium, micro-interaction-driven animations for professional UX.
- **Lucide React**: Vectorized iconography.
- **Tailwind CSS/Vanilla CSS**: Custom design system with glassmorphism and modern aesthetics.

---

## 6. How to Set Up
### 6.1 Database Configuration
1.  Create a PostgreSQL database named `tekapakhi`.
2.  Execute the migration scripts in the `server/migrations` directory in sequential order OR use the `master.sql` (if available) to rebuild the schema.

### 6.2 Server Configuration
1.  Navigate to `/server`.
2.  Create a `.env` file based on `.env.example`.
3.  Install dependencies: `npm install`.
4.  Launch the server: `npm run dev`.

### 6.3 Client Configuration
1.  Navigate to `/client`.
2.  Install dependencies: `npm install`.
3.  Launch the application: `npm run dev`.

---

## 7. Entity Relationship Overview (Logical)
The system follows a star-like schema centered around the **Wallet** entity, linking **Profiles** to **Transactions**, which in turn branch into **Ledger Entries** and **Commissions**. For a detailed view, please refer to the SQL migration files provided in the `migrations/` directory.

---

**Developed for Academic Project.**  
© 2026 [Abrar Ryan](https://github.com/abrar-raad1705) & [Md. Shihabul Hasan](https://github.com/Shibooo169). All Rights Reserved.
