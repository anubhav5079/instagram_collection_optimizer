#!/usr/bin/env node

/**
 * Initialize the SQLite database with schema.
 * Run this before building or deploying.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'instagram.db');

// Create data directory if it doesn't exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  console.log(`[setup-db] Created data directory: ${DB_DIR}`);
}

// Initialize database
const db = new Database(DB_PATH);
console.log(`[setup-db] Using database at: ${DB_PATH}`);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Read and execute schema
const schemaPath = path.join(__dirname, '..', '..', 'scripts', 'init-db.sql');
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  
  // Split by semicolon and execute each statement
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));
  
  for (const stmt of statements) {
    try {
      db.exec(stmt);
    } catch (err) {
      console.error(`[setup-db] Error executing statement:`, err.message);
    }
  }
  
  console.log(`[setup-db] Database schema initialized (${statements.length} statements)`);
} else {
  console.warn(`[setup-db] Schema file not found at ${schemaPath}`);
}

// Verify tables exist
const tables = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' AND name NOT LIKE 'sqlite_%'
`).all();

console.log(`[setup-db] Tables created: ${tables.map(t => t.name).join(', ')}`);
db.close();
console.log('[setup-db] Database initialization complete!');
