import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
// In production, Railway/Render will provide these via environment variables
// In development, load from .env.development.local
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: join(__dirname, '../.env.development.local') });
}

const app = express();
const PORT = process.env.SERVER_PORT || 3000;

// Middleware
// CORS configuration - allow frontend origin in production
const allowedOrigins = process.env.FRONTEND_URL 
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(null, true); // For now, allow all origins - tighten in production if needed
    }
  },
  credentials: true
}));
app.use(express.json());

// Serve static files from dist folder if it exists (production build)
const distPath = join(__dirname, '../dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  
  // Serve index.html for all non-API routes (SPA routing)
  app.get('*', (req, res, next) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(join(distPath, 'index.html'));
  });
}

// PostgreSQL connection pool
// Railway and Render provide DATABASE_URL, parse it if available
let poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cavs_project',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
};

// If DATABASE_URL is provided (Railway, Render, etc.), use it
if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };
} else if (process.env.NODE_ENV === 'production' && process.env.DB_HOST) {
  // For production with individual parameters, always use SSL for Supabase
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
});

// Helper function to transform frontend data to database format
const transformToDatabaseFormat = (frontendData) => {
  const { shots = [], playerName, timestamp, id, status } = frontendData;
  
  // Calculate totals
  const shotsMade = shots.filter(shot => shot.made === true).length;
  const shotsAttempted = shots.length;
  
  // Initialize location counters
  const locationStats = {
    'left-corner': { made: 0, attempted: 0 },
    'right-corner': { made: 0, attempted: 0 },
    'left-wing': { made: 0, attempted: 0 },
    'right-wing': { made: 0, attempted: 0 },
    'top-key': { made: 0, attempted: 0 }
  };
  
  // Count shots per location
  shots.forEach(shot => {
    const locationId = shot.locationId;
    if (locationStats[locationId]) {
      locationStats[locationId].attempted++;
      if (shot.made) {
        locationStats[locationId].made++;
      }
    }
  });
  
  // Map status: 'complete' -> 'complete', 'paused' -> 'in progress'
  let dbStatus = null;
  if (status === 'complete' || status === 'completed') {
    dbStatus = 'complete';
  } else if (status === 'paused') {
    dbStatus = 'in progress';
  }
  
  return {
    id: id || null, // Will use UUID default if null
    player_name: playerName || '',
    session_timestamp: timestamp ? new Date(timestamp) : new Date(),
    shots_made: shotsMade,
    shots_attempted: shotsAttempted,
    left_corner_made: locationStats['left-corner'].made,
    left_corner_attempted: locationStats['left-corner'].attempted,
    right_corner_made: locationStats['right-corner'].made,
    right_corner_attempted: locationStats['right-corner'].attempted,
    left_wing_made: locationStats['left-wing'].made,
    left_wing_attempted: locationStats['left-wing'].attempted,
    right_wing_made: locationStats['right-wing'].made,
    right_wing_attempted: locationStats['right-wing'].attempted,
    top_key_made: locationStats['top-key'].made,
    top_key_attempted: locationStats['top-key'].attempted,
    status: dbStatus
  };
};

// Helper function to transform database format back to frontend format
const transformToFrontendFormat = (dbRow) => {
  return {
    id: dbRow.id,
    playerName: dbRow.player_name,
    timestamp: dbRow.session_timestamp,
    updatedAt: dbRow.session_timestamp,
    stats: {
      attempts: dbRow.shots_attempted,
      makes: dbRow.shots_made,
      misses: dbRow.shots_attempted - dbRow.shots_made
    },
    locations: {
      'left-corner': {
        attempts: dbRow.left_corner_attempted,
        makes: dbRow.left_corner_made
      },
      'right-corner': {
        attempts: dbRow.right_corner_attempted,
        makes: dbRow.right_corner_made
      },
      'left-wing': {
        attempts: dbRow.left_wing_attempted,
        makes: dbRow.left_wing_made
      },
      'right-wing': {
        attempts: dbRow.right_wing_attempted,
        makes: dbRow.right_wing_made
      },
      'top-key': {
        attempts: dbRow.top_key_attempted,
        makes: dbRow.top_key_made
      }
    },
    shots: [] // We don't store individual shots, just aggregates
  };
};

// Table name - will be detected or set
let TABLE_NAME = null;

// Helper function to get table name (no quotes needed for lowercase)
const getTableName = () => {
  if (!TABLE_NAME) {
    throw new Error('Table name not initialized. Please restart the server.');
  }
  return TABLE_NAME;
};

// Initialize database - verify table exists or create it
const initializeDatabase = async () => {
  try {
    // First, verify database connection
    const dbCheck = await pool.query('SELECT current_database()');
    console.log(`📊 Connected to database: ${dbCheck.rows[0].current_database}`);
    
    // Check what tables exist - query information_schema
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'shotsoutof100'
    `);
    
    if (tableCheck.rows.length > 0) {
      TABLE_NAME = tableCheck.rows[0].table_name;
      console.log(`✅ Found table: "${TABLE_NAME}"`);
      
      // Check if status column exists, if not add it
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1
        AND column_name = 'status'
      `, [TABLE_NAME]);
      
      if (columnCheck.rows.length === 0) {
        console.log('📝 Adding status column to existing table...');
        await pool.query(`
          ALTER TABLE ${TABLE_NAME}
          ADD COLUMN status TEXT CHECK (status IN ('complete', 'in progress'))
        `);
        console.log('✅ Status column added successfully');
      }
    } else {
      // Table doesn't exist, create it
      console.log('📝 Table not found. Creating table "shotsoutof100"...');
      await pool.query(`
        CREATE EXTENSION IF NOT EXISTS pgcrypto;

        CREATE TABLE IF NOT EXISTS shotsoutof100 (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          player_name TEXT NOT NULL,
          session_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          shots_made INTEGER NOT NULL CHECK (shots_made >= 0),
          shots_attempted INTEGER NOT NULL CHECK (shots_attempted >= 0),
          CHECK (shots_made <= shots_attempted),
          left_corner_made INTEGER NOT NULL DEFAULT 0 CHECK (left_corner_made >= 0),
          left_corner_attempted INTEGER NOT NULL DEFAULT 0 CHECK (left_corner_attempted >= 0),
          CHECK (left_corner_made <= left_corner_attempted),
          right_corner_made INTEGER NOT NULL DEFAULT 0 CHECK (right_corner_made >= 0),
          right_corner_attempted INTEGER NOT NULL DEFAULT 0 CHECK (right_corner_attempted >= 0),
          CHECK (right_corner_made <= right_corner_attempted),
          left_wing_made INTEGER NOT NULL DEFAULT 0 CHECK (left_wing_made >= 0),
          left_wing_attempted INTEGER NOT NULL DEFAULT 0 CHECK (left_wing_attempted >= 0),
          CHECK (left_wing_made <= left_wing_attempted),
          right_wing_made INTEGER NOT NULL DEFAULT 0 CHECK (right_wing_made >= 0),
          right_wing_attempted INTEGER NOT NULL DEFAULT 0 CHECK (right_wing_attempted >= 0),
          CHECK (right_wing_made <= right_wing_attempted),
          top_key_made INTEGER NOT NULL DEFAULT 0 CHECK (top_key_made >= 0),
          top_key_attempted INTEGER NOT NULL DEFAULT 0 CHECK (top_key_attempted >= 0),
          CHECK (top_key_made <= top_key_attempted),
          status TEXT CHECK (status IN ('complete', 'in progress'))
        );

        CREATE INDEX IF NOT EXISTS idx_shotsoutof100_player_time
          ON shotsoutof100 (player_name, session_timestamp DESC);
      `);
      TABLE_NAME = 'shotsoutof100';
      console.log('✅ Table "shotsoutof100" created successfully');
    }
    
    // Verify table exists and get count
    const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${getTableName()}`);
    console.log(`📊 Current sessions in table: ${countResult.rows[0].count}`);
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    throw error;
  }
};

// Routes

// GET /api/sessions - Get all sessions (optionally filtered by status)
app.get('/api/sessions', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT * FROM ${getTableName()}`;
    let params = [];

    // Filter by status if provided
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY session_timestamp DESC';

    const result = await pool.query(query, params);
    // Transform to frontend format
    const transformed = result.rows.map(transformToFrontendFormat);
    res.json(transformed);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions', details: error.message });
  }
});

// GET /api/sessions/:id - Get a specific session
app.get('/api/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`SELECT * FROM ${getTableName()} WHERE id = $1`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Transform to frontend format
    res.json(transformToFrontendFormat(result.rows[0]));
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session', details: error.message });
  }
});

// POST /api/sessions - Create a new session
app.post('/api/sessions', async (req, res) => {
  try {
    const frontendData = req.body;
    
    console.log('📥 Received request:', JSON.stringify(frontendData, null, 2));
    
    if (!frontendData.playerName) {
      return res.status(400).json({ error: 'playerName is required' });
    }

    const dbData = transformToDatabaseFormat(frontendData);
    
    console.log(`📝 Saving session: playerName=${dbData.player_name}, shots=${dbData.shots_attempted}`);
    console.log('📊 Database data:', JSON.stringify(dbData, null, 2));

    // Always let database generate UUID (don't use frontend id)
    // The frontend id is just for tracking, we'll use database UUID
    const query = `
      INSERT INTO ${getTableName()} (
        player_name, session_timestamp,
        shots_made, shots_attempted,
        left_corner_made, left_corner_attempted,
        right_corner_made, right_corner_attempted,
        left_wing_made, left_wing_attempted,
        right_wing_made, right_wing_attempted,
        top_key_made, top_key_attempted,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;
    
    const params = [
      dbData.player_name, dbData.session_timestamp,
      dbData.shots_made, dbData.shots_attempted,
      dbData.left_corner_made, dbData.left_corner_attempted,
      dbData.right_corner_made, dbData.right_corner_attempted,
      dbData.left_wing_made, dbData.left_wing_attempted,
      dbData.right_wing_made, dbData.right_wing_attempted,
      dbData.top_key_made, dbData.top_key_attempted,
      dbData.status
    ];

    console.log('🔍 Executing query with params:', params);
    const result = await pool.query(query, params);
    console.log(`✅ Session saved successfully: ${result.rows[0].id}`);
    
    // Transform back to frontend format
    res.status(201).json(transformToFrontendFormat(result.rows[0]));
  } catch (error) {
    console.error('❌ Error creating session:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
    console.error('Error hint:', error.hint);
    console.error('Full error:', error);
    res.status(500).json({ 
      error: 'Failed to create session', 
      details: error.message,
      code: error.code,
      hint: error.hint
    });
  }
});

// PATCH /api/sessions/:id - Update an existing session
app.patch('/api/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const frontendData = req.body;

    console.log(`📝 Updating session: id=${id}`);
    console.log('📥 Request data:', JSON.stringify(frontendData, null, 2));

    const dbData = transformToDatabaseFormat({ ...frontendData, id });

    console.log('📊 Database data:', JSON.stringify(dbData, null, 2));

    const query = `
      UPDATE ${getTableName()} SET
        player_name = $1,
        session_timestamp = $2,
        shots_made = $3,
        shots_attempted = $4,
        left_corner_made = $5,
        left_corner_attempted = $6,
        right_corner_made = $7,
        right_corner_attempted = $8,
        left_wing_made = $9,
        left_wing_attempted = $10,
        right_wing_made = $11,
        right_wing_attempted = $12,
        top_key_made = $13,
        top_key_attempted = $14,
        status = $15
      WHERE id = $16
      RETURNING *
    `;

    const params = [
      dbData.player_name, dbData.session_timestamp,
      dbData.shots_made, dbData.shots_attempted,
      dbData.left_corner_made, dbData.left_corner_attempted,
      dbData.right_corner_made, dbData.right_corner_attempted,
      dbData.left_wing_made, dbData.left_wing_attempted,
      dbData.right_wing_made, dbData.right_wing_attempted,
      dbData.top_key_made, dbData.top_key_attempted,
      dbData.status,
      id
    ];

    console.log('🔍 Executing query with params:', params);
    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      console.log(`⚠️ Session not found with id: ${id}`);
      return res.status(404).json({ error: 'Session not found' });
    }

    console.log(`✅ Session updated successfully: ${result.rows[0].id}`);
    
    // Transform back to frontend format
    res.json(transformToFrontendFormat(result.rows[0]));
  } catch (error) {
    console.error('❌ Error updating session:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
    console.error('Error hint:', error.hint);
    console.error('Full error:', error);
    res.status(500).json({ 
      error: 'Failed to update session', 
      details: error.message,
      code: error.code,
      hint: error.hint
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Debug endpoint to check database and table contents
app.get('/api/debug/sessions', async (req, res) => {
  try {
    const dbInfo = await pool.query('SELECT current_database()');
    const tableInfo = await pool.query(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(shots_made) as total_made,
        SUM(shots_attempted) as total_attempted
      FROM ${getTableName()}
    `);
    const recentSessions = await pool.query(`
      SELECT id, player_name, session_timestamp, shots_made, shots_attempted
      FROM ${getTableName()} 
      ORDER BY session_timestamp DESC 
      LIMIT 10
    `);
    
    res.json({
      database: dbInfo.rows[0].current_database,
      table: 'shotsoutof100',
      stats: tableInfo.rows[0],
      recentSessions: recentSessions.rows
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
const startServer = async () => {
  await initializeDatabase();
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API endpoint: http://localhost:${PORT}/api/sessions`);
  });
};

startServer().catch(console.error);
