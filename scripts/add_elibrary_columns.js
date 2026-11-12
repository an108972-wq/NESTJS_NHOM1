const mysql = require('mysql2/promise');

async function migrate() {
  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'library_db',
  };

  console.log('Connecting to MySQL...', config.host, config.database);
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('Connected to MySQL successfully.');

    const alterStatements = [
      `ALTER TABLE books ADD COLUMN IF NOT EXISTS pdfPermission varchar(50) DEFAULT 'PUBLIC'`,
      `ALTER TABLE books ADD COLUMN IF NOT EXISTS digitalViews int DEFAULT 0`,
      `ALTER TABLE books ADD COLUMN IF NOT EXISTS digitalDownloads int DEFAULT 0`,
    ];

    for (const sql of alterStatements) {
      try {
        await connection.query(sql);
        console.log('Executed:', sql);
      } catch (err) {
        console.warn('Warning on statement:', sql, err.message);
      }
    }

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();

