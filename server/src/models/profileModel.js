const pool = require('../config/db');

const profileModel = {
  /**
   * Find a profile by phone number (with type name)
   */
<<<<<<< Updated upstream
  async findByPhone(phoneNumber, client = null) {
    const result = await (client || pool).query(
=======
  async findByPhone(phoneNumber, client = pool) {
    const result = await client.query(
>>>>>>> Stashed changes
      `SELECT p.*, pt.type_name
       FROM tp.profiles p
       JOIN tp.profile_types pt ON p.type_id = pt.type_id
       WHERE p.phone_number = $1`,
      [phoneNumber]
    );
    return result.rows[0] || null;
  },

  /**
   * Find a profile by ID (with type name)
   */
<<<<<<< Updated upstream
  async findById(profileId, client = null) {
    const result = await (client || pool).query(
=======
  async findById(profileId, client = pool) {
    const result = await client.query(
>>>>>>> Stashed changes
      `SELECT p.*, pt.type_name
       FROM tp.profiles p
       JOIN tp.profile_types pt ON p.type_id = pt.type_id
       WHERE p.profile_id = $1`,
      [profileId]
    );
    return result.rows[0] || null;
  },

  /**
   * Find profile with subtype data (customer_profiles, agent_profiles, etc.)
   */
<<<<<<< Updated upstream
  async findByIdWithSubtype(profileId, client = null) {
=======
  async findByIdWithSubtype(profileId, client = pool) {
>>>>>>> Stashed changes
    const profile = await this.findById(profileId, client);
    if (!profile) return null;

    const subtypeTableMap = {
      CUSTOMER: 'customer_profiles',
      AGENT: 'agent_profiles',
      MERCHANT: 'merchant_profiles',
      DISTRIBUTOR: 'distributor_profiles',
      BILLER: 'biller_profiles',
    };

    let subtypeData = null;
    const table = subtypeTableMap[profile.type_name];

    if (table) {
<<<<<<< Updated upstream
      const result = await (client || pool).query(
=======
      const result = await client.query(
>>>>>>> Stashed changes
        `SELECT * FROM tp.${table} WHERE profile_id = $1`,
        [profileId]
      );
      subtypeData = result.rows[0] || null;
    }

    return { ...profile, subtypeData };
  },

  /**
   * Create a new profile
   * Note: DB trigger auto-creates a wallet after insert
   */
<<<<<<< Updated upstream
  async create({ phoneNumber, fullName, pinHash, typeId = 1 }, client = null) {
    const result = await (client || pool).query(
=======
  async create({ phoneNumber, fullName, pinHash, typeId = 1 }, client = pool) {
    const result = await client.query(
>>>>>>> Stashed changes
      `INSERT INTO tp.profiles (phone_number, full_name, security_pin_hash, type_id)
       VALUES ($1, $2, $3, $4)
       RETURNING profile_id, phone_number, full_name, email, is_phone_verified, registration_date, type_id`,
      [phoneNumber, fullName, pinHash, typeId]
    );
    return result.rows[0];
  },

  /**
   * Create customer subtype profile (set to ACTIVE immediately)
   */
<<<<<<< Updated upstream
  async createCustomerSubtype(profileId, client = null) {
    const result = await (client || pool).query(
=======
  async createCustomerSubtype(profileId, client = pool) {
    const result = await client.query(
>>>>>>> Stashed changes
      `INSERT INTO tp.customer_profiles (profile_id, status, approved_date)
       VALUES ($1, 'ACTIVE', CURRENT_TIMESTAMP)
       RETURNING *`,
      [profileId]
    );
    return result.rows[0];
  },

  /**
   * Create agent subtype profile (PENDING_KYC — needs admin approval)
   */
<<<<<<< Updated upstream
  async createAgentSubtype(profileId, { agentCode, shopName, shopAddress }, client = null) {
    const result = await (client || pool).query(
=======
  async createAgentSubtype(profileId, { agentCode, shopName, shopAddress }, client = pool) {
    const result = await client.query(
>>>>>>> Stashed changes
      `INSERT INTO tp.agent_profiles (profile_id, agent_code, shop_name, shop_address, status)
       VALUES ($1, $2, $3, $4, 'PENDING_KYC')
       RETURNING *`,
      [profileId, agentCode, shopName, shopAddress || null]
    );
    return result.rows[0];
  },

  /**
   * Create merchant subtype profile (PENDING_KYC — needs admin approval)
   */
<<<<<<< Updated upstream
  async createMerchantSubtype(profileId, { merchantCode, businessName, businessType }, client = null) {
    const result = await (client || pool).query(
=======
  async createMerchantSubtype(profileId, { merchantCode, businessName, businessType }, client = pool) {
    const result = await client.query(
>>>>>>> Stashed changes
      `INSERT INTO tp.merchant_profiles (profile_id, merchant_code, business_name, business_type, status)
       VALUES ($1, $2, $3, $4, 'PENDING_KYC')
       RETURNING *`,
      [profileId, merchantCode, businessName, businessType || null]
    );
    return result.rows[0];
  },

  /**
   * Create distributor subtype profile (ACTIVE — admin-created)
   */
<<<<<<< Updated upstream
  async createDistributorSubtype(profileId, { region }, client = null) {
    const result = await (client || pool).query(
=======
  async createDistributorSubtype(profileId, { region }, client = pool) {
    const result = await client.query(
>>>>>>> Stashed changes
      `INSERT INTO tp.distributor_profiles (profile_id, region, status, approved_date)
       VALUES ($1, $2, 'ACTIVE', CURRENT_TIMESTAMP)
       RETURNING *`,
      [profileId, region || null]
    );
    return result.rows[0];
  },

  /**
   * Create biller subtype profile (ACTIVE — admin-created)
   */
<<<<<<< Updated upstream
  async createBillerSubtype(profileId, { billerCode, serviceName, category }, client = null) {
    const result = await (client || pool).query(
=======
  async createBillerSubtype(profileId, { billerCode, serviceName, category }, client = pool) {
    const result = await client.query(
>>>>>>> Stashed changes
      `INSERT INTO tp.biller_profiles (profile_id, biller_code, service_name, category, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE')
       RETURNING *`,
      [profileId, billerCode, serviceName, category || null]
    );
    return result.rows[0];
  },

  /**
   * Get account status from the appropriate subtype table
   */
<<<<<<< Updated upstream
  async getAccountStatus(profileId, typeName, client = null) {
=======
  async getAccountStatus(profileId, typeName, client = pool) {
>>>>>>> Stashed changes
    const tableMap = {
      CUSTOMER: 'customer_profiles',
      AGENT: 'agent_profiles',
      MERCHANT: 'merchant_profiles',
      DISTRIBUTOR: 'distributor_profiles',
      BILLER: 'biller_profiles',
    };
    const table = tableMap[typeName];
    if (!table) return 'ACTIVE';

<<<<<<< Updated upstream
    const result = await (client || pool).query(
=======
    const result = await client.query(
>>>>>>> Stashed changes
      `SELECT status FROM tp.${table} WHERE profile_id = $1`,
      [profileId]
    );
    return result.rows[0]?.status || null;
  },

  /**
   * Update profile fields (full_name, email, nid_number)
   */
<<<<<<< Updated upstream
  async update(profileId, fields, client = null) {
=======
  async update(profileId, fields, client = pool) {
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    const result = await (client || pool).query(
=======
    const result = await client.query(
>>>>>>> Stashed changes
      `UPDATE tp.profiles
       SET ${setClauses.join(', ')}
       WHERE profile_id = $${paramIdx}
       RETURNING profile_id, phone_number, full_name, email, nid_number, is_phone_verified, type_id`,
      values
    );
    return result.rows[0];
  },

  /**
   * Update security PIN hash
   */
<<<<<<< Updated upstream
  async updatePin(profileId, pinHash, client = null) {
    await (client || pool).query(
=======
  async updatePin(profileId, pinHash, client = pool) {
    await client.query(
>>>>>>> Stashed changes
      `UPDATE tp.profiles SET security_pin_hash = $1 WHERE profile_id = $2`,
      [pinHash, profileId]
    );
  },

  /**
   * Mark phone number as verified
   */
<<<<<<< Updated upstream
  async setPhoneVerified(phoneNumber, client = null) {
    const result = await (client || pool).query(
=======
  async setPhoneVerified(phoneNumber, client = pool) {
    const result = await client.query(
>>>>>>> Stashed changes
      `UPDATE tp.profiles SET is_phone_verified = TRUE
       WHERE phone_number = $1
       RETURNING profile_id, phone_number, is_phone_verified`,
      [phoneNumber]
    );
    return result.rows[0];
  },

  /**
   * Increment failed PIN attempts (brute force tracking)
   */
<<<<<<< Updated upstream
  async incrementFailedAttempts(profileId, client = null) {
    const result = await (client || pool).query(
=======
  async incrementFailedAttempts(profileId, client = pool) {
    const result = await client.query(
>>>>>>> Stashed changes
      `UPDATE tp.profiles
       SET failed_pin_attempts = COALESCE(failed_pin_attempts, 0) + 1
       WHERE profile_id = $1
       RETURNING failed_pin_attempts`,
      [profileId]
    );
    return result.rows[0];
  },

  /**
   * Lock account until a specific time
   */
<<<<<<< Updated upstream
  async lockAccount(profileId, lockUntil, client = null) {
    await (client || pool).query(
=======
  async lockAccount(profileId, lockUntil, client = pool) {
    await client.query(
>>>>>>> Stashed changes
      `UPDATE tp.profiles SET locked_until = $1 WHERE profile_id = $2`,
      [lockUntil, profileId]
    );
  },

  /**
   * Reset failed attempts and unlock account
   */
<<<<<<< Updated upstream
  async resetFailedAttempts(profileId, client = null) {
    await (client || pool).query(
=======
  async resetFailedAttempts(profileId, client = pool) {
    await client.query(
>>>>>>> Stashed changes
      `UPDATE tp.profiles
       SET failed_pin_attempts = 0, locked_until = NULL
       WHERE profile_id = $1`,
      [profileId]
    );
  },
<<<<<<< Updated upstream
};

module.exports = profileModel;
=======

  /**
   * Update profile picture URL
   */
  async updateProfilePicture(profileId, imageUrl, client = pool) {
    const result = await client.query(
      `UPDATE tp.profiles
       SET profile_picture_url = $1
       WHERE profile_id = $2
       RETURNING profile_id, profile_picture_url`,
      [imageUrl, profileId]
    );
    return result.rows[0];
  },
};

export default profileModel;

>>>>>>> Stashed changes
