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
      // 1. borrow_records
      `ALTER TABLE borrow_records ADD COLUMN IF NOT EXISTS createdAt datetime(6) DEFAULT CURRENT_TIMESTAMP(6)`,
      `ALTER TABLE borrow_records ADD COLUMN IF NOT EXISTS updatedAt datetime(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
      // 2. books
      `ALTER TABLE books ADD COLUMN IF NOT EXISTS createdAt datetime(6) DEFAULT CURRENT_TIMESTAMP(6)`,
      `ALTER TABLE books ADD COLUMN IF NOT EXISTS updatedAt datetime(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
      // 3. book_copies
      `ALTER TABLE book_copies ADD COLUMN IF NOT EXISTS lastAuditedAt datetime NULL`,
      `ALTER TABLE book_copies ADD COLUMN IF NOT EXISTS createdAt datetime(6) DEFAULT CURRENT_TIMESTAMP(6)`,
      `ALTER TABLE book_copies ADD COLUMN IF NOT EXISTS updatedAt datetime(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
      // 4. categories
      `ALTER TABLE categories ADD COLUMN IF NOT EXISTS createdAt datetime(6) DEFAULT CURRENT_TIMESTAMP(6)`,
      `ALTER TABLE categories ADD COLUMN IF NOT EXISTS updatedAt datetime(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
      // 5. publishers
      `ALTER TABLE publishers ADD COLUMN IF NOT EXISTS createdAt datetime(6) DEFAULT CURRENT_TIMESTAMP(6)`,
      `ALTER TABLE publishers ADD COLUMN IF NOT EXISTS updatedAt datetime(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
      // 6. reservations
      `ALTER TABLE reservations ADD COLUMN IF NOT EXISTS updatedAt datetime(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
      // 7. notifications
      `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updatedAt datetime(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
      // 8. library_settings
      `ALTER TABLE library_settings ADD COLUMN IF NOT EXISTS autoLockOverdueDays int DEFAULT 30`,
      `ALTER TABLE library_settings ADD COLUMN IF NOT EXISTS enableAutoLockOverdue boolean DEFAULT 1`,
      `ALTER TABLE library_settings ADD COLUMN IF NOT EXISTS enableAutoEmailReminders boolean DEFAULT 1`,
      `ALTER TABLE library_settings ADD COLUMN IF NOT EXISTS reminderDaysBeforeDue int DEFAULT 2`,
      `ALTER TABLE library_settings ADD COLUMN IF NOT EXISTS readerGroupQuotas json NULL`,
      `ALTER TABLE library_settings ADD COLUMN IF NOT EXISTS vietqrBankId varchar(50) DEFAULT 'MBBank'`,
      `ALTER TABLE library_settings ADD COLUMN IF NOT EXISTS vietqrAccountNo varchar(50) DEFAULT '0388888888'`,
      `ALTER TABLE library_settings ADD COLUMN IF NOT EXISTS vietqrAccountName varchar(150) DEFAULT 'THU VIEN DAI HOC'`,
      `ALTER TABLE library_settings ADD COLUMN IF NOT EXISTS vnpayTmnCode varchar(50) DEFAULT ''`,
      `ALTER TABLE library_settings ADD COLUMN IF NOT EXISTS vnpayHashSecret varchar(255) DEFAULT ''`,
      `ALTER TABLE library_settings ADD COLUMN IF NOT EXISTS vnpayUrl varchar(255) DEFAULT 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'`,
      `ALTER TABLE library_settings ADD COLUMN IF NOT EXISTS momoPartnerCode varchar(50) DEFAULT ''`,
      `ALTER TABLE library_settings ADD COLUMN IF NOT EXISTS momoAccessKey varchar(255) DEFAULT ''`,
      `ALTER TABLE library_settings ADD COLUMN IF NOT EXISTS momoSecretKey varchar(255) DEFAULT ''`,
      `ALTER TABLE library_settings ADD COLUMN IF NOT EXISTS cardRegistrationFee int DEFAULT 20000`,
      `ALTER TABLE library_settings ADD COLUMN IF NOT EXISTS cardReissueFee int DEFAULT 50000`,
      `ALTER TABLE library_settings ADD COLUMN IF NOT EXISTS autoBackupSchedule varchar(20) DEFAULT 'DAILY'`,
      `ALTER TABLE library_settings ADD COLUMN IF NOT EXISTS lastBackupAt datetime NULL`,
      `ALTER TABLE library_settings ADD COLUMN IF NOT EXISTS backupRetentionDays int DEFAULT 30`,
    ];

    for (const sql of alterStatements) {
      try {
        await connection.query(sql);
        console.log('✓ Success:', sql.replace('IF NOT EXISTS ', ''));
      } catch (err) {
        if (err.code === 'ER_PARSE_ERROR' || err.message.includes('syntax')) {
          const rawSql = sql.replace('IF NOT EXISTS ', '');
          try {
            await connection.query(rawSql);
            console.log('✓ Success (fallback):', rawSql);
          } catch (fallbackErr) {
            if (fallbackErr.code === 'ER_DUP_FIELDNAME') {
              console.log('ℹ Already exists:', rawSql.split('ADD COLUMN')[1]?.trim() || rawSql);
            } else {
              console.warn('⚠ Notice:', fallbackErr.message);
            }
          }
        } else if (err.code === 'ER_DUP_FIELDNAME') {
          console.log('ℹ Already exists:', sql);
        } else {
          console.warn('⚠ Notice:', err.message);
        }
      }
    }

    console.log('\n======================================================');
    console.log('  HOÀN TẤT BỔ SUNG CÁC CỘT HỆ THỐNG & CẤU HÌNH!');
    console.log('======================================================\n');
  } catch (err) {
    console.log('Notice connecting to MySQL:', err.message);
    console.log('Khi khởi động NestJS (npm run start:dev), TypeORM (synchronize: true) sẽ tự động đồng bộ.');
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
