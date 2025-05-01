/**
 * Database schema migrations for the application
 *
 * This file defines all the database tables and schema migrations.
 * Each migration should be a SQL statement that creates or alters a database table.
 * Migrations are run in order, so newer migrations should be added to the end of the array.
 */

// Core application tables
export const coreMigrations = [
  // Users table - stores basic user information
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    avatar TEXT,
    teams TEXT, -- Stored as JSON string
    active_rooms TEXT, -- Stored as JSON string
    archived_rooms TEXT, -- Stored as JSON string
    settings TEXT -- Stored as JSON string
  )`,

  // Settings table - stores application settings
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`
];

// Feature-specific tables
export const featureMigrations = [
  // Teams table
  `CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    name TEXT NOT NULL,
    members TEXT, -- Stored as JSON string
    owners TEXT, -- Stored as JSON string
    rooms TEXT, -- Stored as JSON string
    invite_code TEXT,
    settings TEXT -- Stored as JSON string
  )`,

  // Chat rooms table
  `CREATE TABLE IF NOT EXISTS chat_rooms (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    name TEXT DEFAULT 'New Chat',
    unread INTEGER DEFAULT 0,
    active_users TEXT -- Stored as JSON string
  )`,

  // Messages table
  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    room_id TEXT,
    sender TEXT,
    content TEXT NOT NULL,
    avatar TEXT,
    reactions TEXT, -- Stored as JSON string
    reply_to TEXT,
    mention TEXT, -- Stored as JSON string
    attachment TEXT -- Stored as JSON string
  )`,

  // Notifications table
  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    message TEXT NOT NULL,
    sender TEXT,
    receivers TEXT -- Stored as JSON string
  )`,

  // Plan table
  `CREATE TABLE IF NOT EXISTS plan (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    plan_name TEXT,
    plan_overview TEXT,
    assigner TEXT NOT NULL,
    assignee TEXT NOT NULL,
    reviewer TEXT,
    status TEXT,
    room_id TEXT,
    progress INTEGER,
    logs TEXT, -- Stored as JSON string
    context TEXT -- Stored as JSON string
  )`,

  // Task table
  `CREATE TABLE IF NOT EXISTS task (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    start_time TIMESTAMP,
    completed_at TIMESTAMP,
    plan_id TEXT NOT NULL,
    step_number INTEGER NOT NULL,
    task_name TEXT NOT NULL,
    task_explanation TEXT NOT NULL,
    expected_result TEXT,
    mcp_server TEXT,
    skills TEXT, -- Stored as JSON string
    status TEXT,
    result TEXT,
    logs TEXT, -- Stored as JSON string
    FOREIGN KEY (plan_id) REFERENCES plan(id)
  )`,

  // Plan log table
  `CREATE TABLE IF NOT EXISTS plan_log (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type TEXT,
    plan_id TEXT,
    task_id TEXT,
    skill_id TEXT,
    content TEXT
  )`,

  // Skill table
  `CREATE TABLE IF NOT EXISTS skill (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    name TEXT,
    mcp_server TEXT,
    description TEXT,
    type TEXT,
    args TEXT -- Stored as JSON string
  )`,

  // Documents table
  `CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    content TEXT,
    content_path TEXT,
    parent_id TEXT,
    source_type TEXT NOT NULL,
    source_name TEXT NOT NULL,
    source_url TEXT,
    source_file_type TEXT,
    title TEXT NOT NULL,
    author_list TEXT,
    created_at TIMESTAMP,
    last_modified TIMESTAMP,
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    language TEXT NOT NULL,
    document_type TEXT NOT NULL,
    tags TEXT,
    topics TEXT,
    categories TEXT,
    chunk_index INTEGER,
    total_chunks INTEGER,
    chunk_strategy TEXT,
    chunk_size INTEGER,
    chunk_overlap INTEGER,
    chunk_section TEXT,
    embedding_model TEXT,
    embedding_version TEXT,
    embedding_dimensions INTEGER,
    embedding_created_at TIMESTAMP,
    importance_score REAL,
    recency_score REAL,
    view_count INTEGER DEFAULT 0,
    feedback_score REAL,
    additional_metadata TEXT, -- Stored as JSON string
    FOREIGN KEY (parent_id) REFERENCES documents(id)
  )`,

  // Document indexes
  `CREATE INDEX IF NOT EXISTS idx_documents_parent_id ON documents(parent_id)`,
  `CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type)`,
  `CREATE INDEX IF NOT EXISTS idx_documents_language ON documents(language)`,
  `CREATE INDEX IF NOT EXISTS idx_documents_ingested_at ON documents(ingested_at)`,

  // Document view
  `CREATE VIEW IF NOT EXISTS document_view AS
   SELECT
      id,
      title,
      content,
      document_type,
      language,
      source_name,
      ingested_at,
      CASE WHEN parent_id IS NULL THEN 'Parent' ELSE 'Chunk' END as doc_type,
      view_count
   FROM
      documents
   ORDER BY
      ingested_at DESC`
];

// Combined migrations array for all schema updates
export const allMigrations = [
  ...coreMigrations,
  ...featureMigrations
];