
export const initDB = async (db) => {
  try {
    await db.execAsync(`
      -- Create the users table if it doesn't exist
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
      -- Optional: Set journal mode for performance
      PRAGMA journal_mode=WAL;
    `);
    console.log("Users table ensured/created.");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
};


export const insertUser = async (db, name, email, password) => {
  try {
    await db.runAsync(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, password]
    );
    const result = await db.getFirstAsync('SELECT id, name, email FROM users WHERE email = ?', [email]);
    return result;
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed: users.email')) {
      throw new Error('This email is already registered.');
    }
    console.error("Database insert user error:", error);
    throw error;
  }
};

export const getUser = async (db, email, password) => {
  try {
    const users = await db.getAllAsync(
      'SELECT id, name, email FROM users WHERE email = ? AND password = ?',
      [email, password]
    );
    return users; 
  } catch (error) {
    console.error("Database get user error:", error);
    throw error;
  }
};