import pool, { DB_SCHEMA } from "../config/db.js";

const profileModel = {
  /**
   * Find a profile by phone number (with type name)
   */
  async findByPhone(phoneNumber) {
    const result = await pool.query(
      `SELECT p.*, pt.type_name
       FROM ${DB_SCHEMA}.profiles p
       JOIN ${DB_SCHEMA}.profile_types pt ON p.type_id = pt.type_id
       WHERE p.phone_number = $1`,
      [phoneNumber],
    );
    return result.rows[0] || null;
  },

  /**
   * Find a profile by ID (with type name)
   */
  async findById(profileId) {
    const result = await pool.query(
      `SELECT p.*, pt.type_name
       FROM ${DB_SCHEMA}.profiles p
       JOIN ${DB_SCHEMA}.profile_types pt ON p.type_id = pt.type_id
       WHERE p.profile_id = $1`,
      [profileId],
    );
    return result.rows[0] || null;
  },

  async listConnectedAgentsForDistributor(distributorProfileId) {
    const result = await pool.query(
      `SELECT
         p.profile_id,
         p.full_name AS target_name,
         p.phone_number AS target_phone,
         p.profile_picture_url AS target_profile_picture_url,
         sr.recipient_id AS saved_recipient_id,
         sr.nickname,
         w.balance AS target_balance,
         w.max_balance AS target_max_balance,
         ap.agent_code,
         ap.shop_name
       FROM ${DB_SCHEMA}.agent_profiles ap
       JOIN ${DB_SCHEMA}.profiles p
         ON p.profile_id = ap.profile_id
       JOIN ${DB_SCHEMA}.wallets w
         ON w.profile_id = p.profile_id
       LEFT JOIN ${DB_SCHEMA}.saved_recipients sr
         ON sr.saver_profile_id = $1
        AND sr.target_profile_id = p.profile_id
       WHERE ap.distributor_id = $1
         AND ap.status = 'ACTIVE'
       ORDER BY
         LOWER(COALESCE(NULLIF(TRIM(sr.nickname), ''), p.full_name)),
         LOWER(p.full_name),
         p.phone_number`,
      [distributorProfileId],
    );
    return result.rows;
  },

  async getAgentDistributorId(agentProfileId) {
    const result = await pool.query(
      `SELECT distributor_id
       FROM ${DB_SCHEMA}.agent_profiles
       WHERE profile_id = $1
         AND status = 'ACTIVE'
       LIMIT 1`,
      [agentProfileId],
    );
    return result.rows[0]?.distributor_id || null;
  },

  async getConnectedDistributorForAgent(agentProfileId) {
    const result = await pool.query(
      `SELECT
         p.profile_id,
         p.full_name AS target_name,
         p.phone_number AS target_phone,
         p.profile_picture_url AS target_profile_picture_url,
         w.balance AS target_balance,
         w.max_balance AS target_max_balance
       FROM ${DB_SCHEMA}.agent_profiles ap
       JOIN ${DB_SCHEMA}.profiles p ON p.profile_id = ap.distributor_id
       JOIN ${DB_SCHEMA}.wallets w ON w.profile_id = p.profile_id
       WHERE ap.profile_id = $1
         AND ap.status = 'ACTIVE'
       LIMIT 1`,
      [agentProfileId],
    );
    return result.rows[0] || null;
  },

  async isAgentConnectedToDistributor(distributorProfileId, agentProfileId) {
    const result = await pool.query(
      `SELECT 1
       FROM ${DB_SCHEMA}.agent_profiles
       WHERE distributor_id = $1
         AND profile_id = $2
         AND status = 'ACTIVE'
       LIMIT 1`,
      [distributorProfileId, agentProfileId],
    );
    return result.rowCount > 0;
  },

  /**
   * Find profile with subtype data (customer_profiles, agent_profiles, etc.)
   */
  async findByIdWithSubtype(profileId) {
    const profile = await this.findById(profileId);
    if (!profile) return null;

    // Map type names to their subtype tables
    const subtypeTableMap = {
      CUSTOMER: "customer_profiles",
      AGENT: "agent_profiles",
      MERCHANT: "merchant_profiles",
      DISTRIBUTOR: "distributor_profiles",
      BILLER: "biller_profiles",
    };

    let subtypeData = null;
    const table = subtypeTableMap[profile.type_name];

    if (table) {
      const result = await pool.query(
        `SELECT * FROM ${DB_SCHEMA}.${table} WHERE profile_id = $1`,
        [profileId],
      );
      subtypeData = result.rows[0] || null;
    }

    return { ...profile, subtypeData };
  },

  /**
   * Create a new profile
   * Note: DB trigger auto-creates a wallet after insert
   */
  async create(
    { phoneNumber, fullName, pinHash, typeId = 1, email = null },
    client = null,
  ) {
    const db = client || pool;
    const result = await db.query(
      `INSERT INTO ${DB_SCHEMA}.profiles (phone_number, full_name, security_pin_hash, type_id, email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING profile_id, phone_number, full_name, email, is_phone_verified, registration_date, type_id`,
      [phoneNumber, fullName, pinHash, typeId, email || null],
    );
    return result.rows[0];
  },

  /**
   * Create customer subtype profile (set to ACTIVE immediately)
   */
  async createCustomerSubtype(profileId, client = null) {
    const db = client || pool;
    const result = await db.query(
      `INSERT INTO ${DB_SCHEMA}.customer_profiles (profile_id, status, approved_date)
       VALUES ($1, 'ACTIVE', CURRENT_TIMESTAMP)
       RETURNING *`,
      [profileId],
    );
    return result.rows[0];
  },

  /**
   * Create agent subtype profile (PENDING_KYC — needs admin approval)
   */
  async createAgentSubtype(
    profileId,
    { agentCode, shopName, shopAddress, district, area },
    client = null,
  ) {
    const db = client || pool;
    const result = await db.query(
      `INSERT INTO ${DB_SCHEMA}.agent_profiles (profile_id, agent_code, shop_name, shop_address, district, area, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING_KYC')
       RETURNING *`,
      [
        profileId,
        agentCode,
        shopName,
        shopAddress || null,
        district || null,
        area || null,
      ],
    );
    return result.rows[0];
  },

  /**
   * Create merchant subtype profile (PENDING_KYC — needs admin approval)
   */
  async createMerchantSubtype(
    profileId,
    { merchantCode, shopName, shopAddress, district, area },
    client = null,
  ) {
    const db = client || pool;
    const result = await db.query(
      `INSERT INTO ${DB_SCHEMA}.merchant_profiles (profile_id, merchant_code, shop_name, shop_address, district, area, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING_KYC')
       RETURNING *`,
      [
        profileId,
        merchantCode,
        shopName,
        shopAddress || null,
        district || null,
        area || null,
      ],
    );
    return result.rows[0];
  },

  /**
   * Create distributor subtype (admin). business_name, areas in distributor_areas; contact saved as profiles.full_name.
   */
  async createDistributorSubtype(
    profileId,
    { businessName, additionalInfo, areas },
    client = null,
  ) {
    const db = client || pool;
    const result = await db.query(
      `INSERT INTO ${DB_SCHEMA}.distributor_profiles
         (profile_id, business_name, additional_info, status, created_at, pending_pin_setup)
       VALUES ($1, $2, $3, 'ACTIVE', CURRENT_TIMESTAMP, TRUE)
       RETURNING *`,
      [profileId, businessName, additionalInfo || null],
    );
    for (const { district, area } of areas) {
      await db.query(
        `INSERT INTO ${DB_SCHEMA}.distributor_areas (profile_id, district, area) VALUES ($1, $2, $3)`,
        [profileId, district, area],
      );
    }
    return result.rows[0];
  },

  /**
   * Create biller subtype profile (ACTIVE — admin-created, temp PIN)
   */
  async createBillerSubtype(
    profileId,
    { serviceName, billerType, senderChargeFlat, senderChargePercent },
    client = null,
  ) {
    const db = client || pool;
    const result = await db.query(
      `INSERT INTO ${DB_SCHEMA}.biller_profiles
         (profile_id, service_name, biller_type, sender_charge_flat, sender_charge_percent, status, pending_pin_setup)
       VALUES ($1, $2, $3::${DB_SCHEMA}.biller_type, $4, $5, 'ACTIVE', TRUE)
       RETURNING *`,
      [
        profileId,
        serviceName,
        billerType || 'Others',
        senderChargeFlat || 0,
        senderChargePercent || 0,
      ],
    );
    return result.rows[0];
  },

  /**
   * Get account status from the appropriate subtype table
   */
  async getAccountStatus(profileId, typeName) {
    const tableMap = {
      CUSTOMER: "customer_profiles",
      AGENT: "agent_profiles",
      MERCHANT: "merchant_profiles",
      DISTRIBUTOR: "distributor_profiles",
      BILLER: "biller_profiles",
    };
    const table = tableMap[typeName];
    if (!table) return "ACTIVE"; // SYSTEM profiles are always active

    const result = await pool.query(
      `SELECT status FROM ${DB_SCHEMA}.${table} WHERE profile_id = $1`,
      [profileId],
    );
    return result.rows[0]?.status || null;
  },

  /**
   * Update profile fields (full_name, email, nid_number)
   */
  async update(profileId, fields, client = null) {
    const db = client || pool;
    const setClauses = [];
    const values = [];
    let paramIdx = 1;

    if (fields.fullName !== undefined) {
      setClauses.push(`full_name = $${paramIdx++}`);
      values.push(fields.fullName);
    }
    if (fields.email !== undefined) {
      setClauses.push(`email = $${paramIdx++}`);
      values.push(fields.email);
    }
    if (fields.nidNumber !== undefined) {
      setClauses.push(`nid_number = $${paramIdx++}`);
      values.push(fields.nidNumber);
    }

    if (setClauses.length === 0) return null;

    values.push(profileId);
    const result = await db.query(
      `UPDATE ${DB_SCHEMA}.profiles
       SET ${setClauses.join(", ")}
       WHERE profile_id = $${paramIdx}
       RETURNING profile_id, phone_number, full_name, email, nid_number, is_phone_verified, type_id`,
      values,
    );
    return result.rows[0];
  },

  /**
   * Update security PIN hash
   */
  async updatePin(profileId, pinHash, client = null) {
    const db = client || pool;
    await db.query(
      `UPDATE ${DB_SCHEMA}.profiles SET security_pin_hash = $1 WHERE profile_id = $2`,
      [pinHash, profileId],
    );
  },

  /**
   * Admin: allow/revoke one-time Forgot PIN for agent, distributor, biller.
   */
  async setPinResetGranted(profileId, granted, client = null) {
    const db = client || pool;
    const result = await db.query(
      `UPDATE ${DB_SCHEMA}.profiles SET pin_reset_granted = $2 WHERE profile_id = $1
       RETURNING profile_id, pin_reset_granted`,
      [profileId, granted],
    );
    return result.rows[0] || null;
  },

  /**
   * Mark phone number as verified
   */
  async setPhoneVerified(phoneNumber, client = null) {
    const db = client || pool;
    const result = await db.query(
      `UPDATE ${DB_SCHEMA}.profiles SET is_phone_verified = TRUE
       WHERE phone_number = $1
       RETURNING profile_id, phone_number, is_phone_verified`,
      [phoneNumber],
    );
    return result.rows[0];
  },

  /**
   * Increment failed PIN attempts (brute force tracking)
   */
  async incrementFailedAttempts(profileId, client = null) {
    const db = client || pool;
    const result = await db.query(
      `UPDATE ${DB_SCHEMA}.profiles
       SET failed_pin_attempts = COALESCE(failed_pin_attempts, 0) + 1
       WHERE profile_id = $1
       RETURNING failed_pin_attempts`,
      [profileId],
    );
    return result.rows[0];
  },

  /**
   * Lock account until a specific time
   */
  async lockAccount(profileId, lockUntil, client = null) {
    const db = client || pool;
    await db.query(
      `UPDATE ${DB_SCHEMA}.profiles SET locked_until = $1 WHERE profile_id = $2`,
      [lockUntil, profileId],
    );
  },

  /**
   * Reset failed attempts and unlock account
   */
  async resetFailedAttempts(profileId, client = null) {
    const db = client || pool;
    await db.query(
      `UPDATE ${DB_SCHEMA}.profiles
       SET failed_pin_attempts = 0, locked_until = NULL
       WHERE profile_id = $1`,
      [profileId],
    );
  },

  /**
   * Update profile picture URL
   */
  async updateProfilePicture(profileId, imageUrl, client = null) {
    const db = client || pool;
    const result = await db.query(
      `UPDATE ${DB_SCHEMA}.profiles
       SET profile_picture_url = $1
       WHERE profile_id = $2
       RETURNING profile_id, profile_picture_url`,
      [imageUrl, profileId],
    );
    return result.rows[0];
  },
};

export default profileModel;
