import mysql from 'mysql2/promise';

// MySQL connection pool
let pool: mysql.Pool | null = null;

/**
 * Create MySQL connection pool with SSL support
 */
function createPool(): mysql.Pool {
  if (pool) {
    return pool;
  }

  const config: mysql.PoolOptions = {
    host: process.env.MYSQL_HOST!,
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    database: process.env.MYSQL_DATABASE!,
    user: process.env.MYSQL_USERNAME!,
    password: process.env.MYSQL_PASSWORD!,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };

  // Add SSL configuration if base64 certificate is provided
  if (process.env.MYSQL_SSL_CA_BASE64) {
    try {
      const sslCert = Buffer.from(process.env.MYSQL_SSL_CA_BASE64, 'base64').toString('utf8');
      config.ssl = {
        ca: sslCert,
        rejectUnauthorized: true,
      };
      console.log('MySQL SSL certificate configured from base64 environment variable');
    } catch (error) {
      console.error('Failed to decode MySQL SSL certificate from base64:', error);
      throw new Error('Invalid MySQL SSL certificate format');
    }
  }

  pool = mysql.createPool(config);

  console.log('MySQL connection pool created');
  return pool;
}

/**
 * Get MySQL connection from pool
 */
export async function getConnection(): Promise<mysql.PoolConnection> {
  const connectionPool = createPool();
  return connectionPool.getConnection();
}

/**
 * Execute MySQL query with automatic connection management
 */
export async function executeQuery<T = unknown>(
  query: string,
  params: unknown[] = []
): Promise<[T[], mysql.FieldPacket[]]> {
  const connection = await getConnection();

  try {
    console.log('Executing MySQL query:', query.substring(0, 100) + (query.length > 100 ? '...' : ''));
    const result = await connection.execute(query, params) as [T[], mysql.FieldPacket[]];
    return result;
  } catch (error) {
    console.error('MySQL query error:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Test MySQL connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const [rows] = await executeQuery<{ test: number }>('SELECT 1 as test');
    return Array.isArray(rows) && rows.length > 0 && rows[0].test === 1;
  } catch (error) {
    console.error('MySQL connection test failed:', error);
    return false;
  }
}

/**
 * Close MySQL connection pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('MySQL connection pool closed');
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});