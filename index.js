const pool = require("./db");

async function testConnection() {
  let client;

  try {
    client = await pool.connect();
    console.log("Connected to PostgreSQL");

    // const ins = await client.query(`
    //   	INSERT INTO tp.profiles (
	// 		phone_number,
	// 		full_name,
	// 		security_pin_hash
	// 	)
	// 	VALUES (
	// 		'01712345678',
	// 		'Test User',
	// 		'hashed_pin_here'
	// 	)
	// 	RETURNING profile_id;
    // `);
    // console.log("Profiles:", ins.rows);
	
	// const del = await client.query(`
	// 	DELETE FROM tp.PROFILES
	// 	WHERE profile_id = 4;
	// `);
	// console.log(del.rows);

	const res = await client.query(`
		SELECT * FROM tp.PROFILES;
	`)
	console.log(res.rows);

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

testConnection();
