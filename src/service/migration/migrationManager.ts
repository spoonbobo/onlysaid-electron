import { IMigration, IMigrationState, allMigrations, sortMigrationsByDependencies, validateMigrationDependencies } from './migrations';
import { executeQuery, executeTransaction } from '../db';
import crypto from 'crypto';

export class MigrationManager {
  private environment: 'development' | 'production' | 'test';

  constructor(environment: 'development' | 'production' | 'test' = 'development') {
    this.environment = environment;
  }

  private generateChecksum(migration: IMigration): string {
    return crypto.createHash('sha256').update(migration.up).digest('hex');
  }

  private async getMigrationState(): Promise<string[]> {
    try {
      const result = await executeQuery(
        'SELECT migration_id FROM migration_state WHERE environment = ? ORDER BY applied_at',
        [this.environment]
      );
      return result.map((row: any) => row.migration_id);
    } catch (error) {
      return [];
    }
  }

  private async recordMigration(migration: IMigration): Promise<void> {
    const checksum = this.generateChecksum(migration);

    try {
      await executeQuery(
        `INSERT OR REPLACE INTO migration_state
         (migration_id, version, applied_at, environment, checksum)
         VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)`,
        [migration.id, migration.version, this.environment, checksum]
      );
    } catch (error: any) {
      if (error.code === 'SQLITE_ERROR' && error.message.includes('no such table: migration_state')) {
        if (migration.id === 'core_002') {
          return;
        } else {
          console.warn(`Cannot record migration ${migration.id} - migration_state table not yet created`);
          return;
        }
      }
      throw error;
    }
  }

  private async removeMigrationRecord(migrationId: string): Promise<void> {
    await executeQuery(
      'DELETE FROM migration_state WHERE migration_id = ? AND environment = ?',
      [migrationId, this.environment]
    );
  }

  private async validateMigrationIntegrity(migration: IMigration): Promise<boolean> {
    try {
      const result = await executeQuery(
        'SELECT checksum FROM migration_state WHERE migration_id = ? AND environment = ?',
        [migration.id, this.environment]
      );

      if (result.length === 0) return true;

      const storedChecksum = result[0].checksum;
      const currentChecksum = this.generateChecksum(migration);

      return storedChecksum === currentChecksum;
    } catch (error) {
      return true;
    }
  }

  private async validateTableSchema(tableName: string, columnName?: string): Promise<boolean> {
    try {
      const tableInfo = await executeQuery(`PRAGMA table_info(${tableName})`);
      if (tableInfo.length === 0) {
        return false;
      }

      if (columnName) {
        return tableInfo.some((col: any) => col.name === columnName);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  private async executeMigrationSafely(migration: IMigration, db: any): Promise<void> {
    // Special handling for index migrations to prevent column errors
    if (migration.category === 'index') {
      const indexStatements = migration.up.split(';').filter(stmt => stmt.trim());

      for (const statement of indexStatements) {
        const trimmed = statement.trim();
        if (!trimmed || trimmed.startsWith('--')) continue;

        const indexMatch = trimmed.match(/CREATE INDEX.*ON\s+(\w+)\s*\(([^)]+)\)/i);
        if (indexMatch) {
          const tableName = indexMatch[1];
          const columns = indexMatch[2].split(',').map(col => col.trim());

          if (!(await this.validateTableSchema(tableName))) {
            console.warn(`Skipping index creation: table ${tableName} does not exist`);
            continue;
          }

          let allColumnsExist = true;
          for (const column of columns) {
            if (!(await this.validateTableSchema(tableName, column))) {
              console.warn(`Skipping index creation: column ${column} does not exist in table ${tableName}`);
              allColumnsExist = false;
              break;
            }
          }

          if (allColumnsExist) {
            try {
              db.exec(trimmed);
            } catch (error: any) {
              if (error.code === 'SQLITE_ERROR' && error.message.includes('no such column')) {
                console.warn(`Skipping index creation due to missing column: ${error.message}`);
                continue;
              }
              throw error;
            }
          }
        } else {
          db.exec(trimmed);
        }
      }
    } else {
      db.exec(migration.up);
    }
  }

  async runMigrations(): Promise<void> {
    console.log(`Running migrations for ${this.environment} environment...`);

    const appliedMigrations = await this.getMigrationState();
    const sortedMigrations = sortMigrationsByDependencies(allMigrations);
    const pendingMigrations = sortedMigrations.filter(m => !appliedMigrations.includes(m.id));

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations.');
      return;
    }

    console.log(`Found ${pendingMigrations.length} pending migrations.`);

    await executeTransaction(async (db) => {
      const migrationsToRecord: IMigration[] = [];

      for (const migration of pendingMigrations) {
        if (!validateMigrationDependencies(migration, appliedMigrations)) {
          console.warn(`Migration ${migration.id} has unmet dependencies, skipping for now`);
          continue;
        }

        if (appliedMigrations.includes(migration.id)) {
          const isValid = await this.validateMigrationIntegrity(migration);
          if (!isValid) {
            throw new Error(`Migration ${migration.id} has been modified after application`);
          }
          continue;
        }

        try {
          console.log(`Applying migration: ${migration.id} - ${migration.name}`);

          await this.executeMigrationSafely(migration, db);

          // Special handling for core_002 (migration_state table creation)
          if (migration.id === 'core_002') {
            await this.recordMigration(migration);

            for (const prevMigration of migrationsToRecord) {
              await this.recordMigration(prevMigration);
            }
          } else {
            try {
              await this.recordMigration(migration);
            } catch (recordError: any) {
              if (recordError.code === 'SQLITE_ERROR' && recordError.message.includes('no such table: migration_state')) {
                migrationsToRecord.push(migration);
              } else {
                throw recordError;
              }
            }
          }

          appliedMigrations.push(migration.id);
          console.log(`✓ Applied migration: ${migration.id}`);
        } catch (error: any) {
          // Production: log error but continue with other migrations
          if (this.environment === 'production' && error.code === 'SQLITE_ERROR') {
            console.error(`⚠ Failed to apply migration ${migration.id} (continuing): ${error.message}`);
            continue;
          }

          console.error(`✗ Failed to apply migration ${migration.id}:`, error);
          throw error;
        }
      }
    });

    console.log('All migrations completed successfully.');
  }

  async rollbackMigration(migrationId: string): Promise<void> {
    const migration = allMigrations.find(m => m.id === migrationId);
    if (!migration) {
      throw new Error(`Migration ${migrationId} not found`);
    }

    if (!migration.down) {
      throw new Error(`Migration ${migrationId} does not support rollback`);
    }

    const appliedMigrations = await this.getMigrationState();
    if (!appliedMigrations.includes(migrationId)) {
      throw new Error(`Migration ${migrationId} is not applied`);
    }

    const dependentMigrations = allMigrations.filter(m =>
      m.dependencies?.includes(migrationId) && appliedMigrations.includes(m.id)
    );

    if (dependentMigrations.length > 0) {
      throw new Error(
        `Cannot rollback ${migrationId}. Dependent migrations must be rolled back first: ${dependentMigrations.map(m => m.id).join(', ')}`
      );
    }

    await executeTransaction(async (db) => {
      try {
        console.log(`Rolling back migration: ${migration.id} - ${migration.name}`);
        db.exec(migration.down!);
        await this.removeMigrationRecord(migration.id);
        console.log(`✓ Rolled back migration: ${migration.id}`);
      } catch (error) {
        console.error(`✗ Failed to rollback migration ${migration.id}:`, error);
        throw error;
      }
    });
  }

  async getMigrationStatus(): Promise<{
    applied: string[];
    pending: string[];
    total: number;
    environment: string;
  }> {
    const appliedMigrations = await this.getMigrationState();
    const allMigrationIds = allMigrations.map(m => m.id);
    const pendingMigrations = allMigrationIds.filter(id => !appliedMigrations.includes(id));

    return {
      applied: appliedMigrations,
      pending: pendingMigrations,
      total: allMigrations.length,
      environment: this.environment
    };
  }

  async resetMigrations(): Promise<void> {
    if (this.environment === 'production') {
      throw new Error('Cannot reset migrations in production environment');
    }

    await executeQuery(
      'DELETE FROM migration_state WHERE environment = ?',
      [this.environment]
    );

    console.log(`Reset all migrations for ${this.environment} environment.`);
  }

  async exportMigrationState(): Promise<IMigrationState> {
    const appliedMigrations = await this.getMigrationState();
    const lastApplied = appliedMigrations[appliedMigrations.length - 1] || '';
    const lastMigration = allMigrations.find(m => m.id === lastApplied);
    const version = lastMigration?.version || '0.0.0';

    return {
      version,
      appliedMigrations,
      lastApplied,
      environment: this.environment
    };
  }

  async importMigrationState(state: IMigrationState): Promise<void> {
    if (state.environment !== this.environment) {
      console.warn(`Importing state from ${state.environment} to ${this.environment}`);
    }

    await executeTransaction(async () => {
      await executeQuery(
        'DELETE FROM migration_state WHERE environment = ?',
        [this.environment]
      );

      for (const migrationId of state.appliedMigrations) {
        const migration = allMigrations.find(m => m.id === migrationId);
        if (migration) {
          await this.recordMigration(migration);
        }
      }
    });

    console.log(`Imported migration state for ${this.environment} environment.`);
  }

  async forceApplyMigration(migrationId: string): Promise<void> {
    const migration = allMigrations.find(m => m.id === migrationId);
    if (!migration) {
      throw new Error(`Migration ${migrationId} not found`);
    }

    console.log(`Force applying migration: ${migration.id} - ${migration.name}`);

    await executeTransaction(async (db) => {
      try {
        db.exec(migration.up);
        await this.recordMigration(migration);
        console.log(`✓ Force applied migration: ${migration.id}`);
      } catch (error) {
        console.error(`✗ Failed to force apply migration ${migration.id}:`, error);
        throw error;
      }
    });
  }

  async checkTableSchema(tableName: string): Promise<any> {
    try {
      const result = await executeQuery(`PRAGMA table_info(${tableName})`);
      return result;
    } catch (error) {
      console.error(`Error checking schema for table ${tableName}:`, error);
      return null;
    }
  }
}

export const migrationManager = new MigrationManager(
  process.env.NODE_ENV === 'production' ? 'production' : 'development'
);