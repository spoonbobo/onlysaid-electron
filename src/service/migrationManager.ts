import { IMigration, IMigrationState, allMigrations, sortMigrationsByDependencies, validateMigrationDependencies } from './migrations';
import { executeQuery, executeTransaction } from './db';
import crypto from 'crypto';

export class MigrationManager {
  private environment: 'development' | 'production' | 'test';

  constructor(environment: 'development' | 'production' | 'test' = 'development') {
    this.environment = environment;
  }

  /**
   * Generate checksum for migration content to detect changes
   */
  private generateChecksum(migration: IMigration): string {
    return crypto.createHash('sha256').update(migration.up).digest('hex');
  }

  /**
   * Get current migration state from database
   */
  private async getMigrationState(): Promise<string[]> {
    try {
      const result = await executeQuery(
        'SELECT migration_id FROM migration_state WHERE environment = ? ORDER BY applied_at',
        [this.environment]
      );
      return result.map((row: any) => row.migration_id);
    } catch (error) {
      // Migration state table doesn't exist yet
      return [];
    }
  }

  /**
   * Record migration as applied
   */
  private async recordMigration(migration: IMigration): Promise<void> {
    const checksum = this.generateChecksum(migration);

    // Check if migration_state table exists, if not, skip recording for core migrations
    try {
      await executeQuery(
        `INSERT OR REPLACE INTO migration_state
         (migration_id, version, applied_at, environment, checksum)
         VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)`,
        [migration.id, migration.version, this.environment, checksum]
      );
    } catch (error: any) {
      // If migration_state table doesn't exist and this is the core_002 migration that creates it,
      // we need to handle this specially
      if (error.code === 'SQLITE_ERROR' && error.message.includes('no such table: migration_state')) {
        if (migration.id === 'core_002') {
          // For core_002, we'll record it after the table is created
          // Execute the migration first, then record it
          return;
        } else {
          // For other migrations before core_002, we can't record them yet
          console.warn(`Cannot record migration ${migration.id} - migration_state table not yet created`);
          return;
        }
      }
      throw error;
    }
  }

  /**
   * Remove migration record (for rollback)
   */
  private async removeMigrationRecord(migrationId: string): Promise<void> {
    await executeQuery(
      'DELETE FROM migration_state WHERE migration_id = ? AND environment = ?',
      [migrationId, this.environment]
    );
  }

  /**
   * Validate migration integrity
   */
  private async validateMigrationIntegrity(migration: IMigration): Promise<boolean> {
    try {
      const result = await executeQuery(
        'SELECT checksum FROM migration_state WHERE migration_id = ? AND environment = ?',
        [migration.id, this.environment]
      );

      if (result.length === 0) return true; // Not applied yet

      const storedChecksum = result[0].checksum;
      const currentChecksum = this.generateChecksum(migration);

      return storedChecksum === currentChecksum;
    } catch (error) {
      return true; // Assume valid if we can't check
    }
  }

  /**
   * Run all pending migrations
   */
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
        // Validate dependencies
        if (!validateMigrationDependencies(migration, appliedMigrations)) {
          throw new Error(`Migration ${migration.id} has unmet dependencies`);
        }

        // Validate integrity for already applied migrations
        if (appliedMigrations.includes(migration.id)) {
          const isValid = await this.validateMigrationIntegrity(migration);
          if (!isValid) {
            throw new Error(`Migration ${migration.id} has been modified after application`);
          }
          continue;
        }

        try {
          console.log(`Applying migration: ${migration.id} - ${migration.name}`);

          // Execute migration
          db.exec(migration.up);

          // Special handling for core_002 (migration_state table creation)
          if (migration.id === 'core_002') {
            // Now that migration_state table exists, record this migration and any previous ones
            await this.recordMigration(migration);

            // Record any previous migrations that couldn't be recorded
            for (const prevMigration of migrationsToRecord) {
              await this.recordMigration(prevMigration);
            }
          } else {
            // Try to record the migration
            try {
              await this.recordMigration(migration);
            } catch (recordError: any) {
              if (recordError.code === 'SQLITE_ERROR' && recordError.message.includes('no such table: migration_state')) {
                // Store for later recording after core_002
                migrationsToRecord.push(migration);
              } else {
                throw recordError;
              }
            }
          }

          appliedMigrations.push(migration.id);
          console.log(`✓ Applied migration: ${migration.id}`);
        } catch (error) {
          console.error(`✗ Failed to apply migration ${migration.id}:`, error);
          throw error;
        }
      }
    });

    console.log('All migrations completed successfully.');
  }

  /**
   * Rollback specific migration
   */
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

    // Check for dependent migrations
    const dependentMigrations = allMigrations.filter(m =>
      m.dependencies?.includes(migrationId) && appliedMigrations.includes(m.id)
    );

    if (dependentMigrations.length > 0) {
      throw new Error(
        `Cannot rollback ${migrationId}. Dependent migrations must be rolled back first: ${dependentMigrations.map(m => m.id).join(', ')
        }`
      );
    }

    await executeTransaction(async (db) => {
      try {
        console.log(`Rolling back migration: ${migration.id} - ${migration.name}`);

        // Execute rollback
        db.exec(migration.down!);

        // Remove migration record
        await this.removeMigrationRecord(migration.id);

        console.log(`✓ Rolled back migration: ${migration.id}`);
      } catch (error) {
        console.error(`✗ Failed to rollback migration ${migration.id}:`, error);
        throw error;
      }
    });
  }

  /**
   * Get migration status
   */
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

  /**
   * Reset all migrations (dangerous - for development only)
   */
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

  /**
   * Export migration state for backup/restore
   */
  async exportMigrationState(): Promise<IMigrationState> {
    const appliedMigrations = await this.getMigrationState();
    const lastApplied = appliedMigrations[appliedMigrations.length - 1] || '';

    // Get version from last applied migration
    const lastMigration = allMigrations.find(m => m.id === lastApplied);
    const version = lastMigration?.version || '0.0.0';

    return {
      version,
      appliedMigrations,
      lastApplied,
      environment: this.environment
    };
  }

  /**
   * Import migration state (for restoring from backup)
   */
  async importMigrationState(state: IMigrationState): Promise<void> {
    if (state.environment !== this.environment) {
      console.warn(`Importing state from ${state.environment} to ${this.environment}`);
    }

    await executeTransaction(async () => {
      // Clear existing state
      await executeQuery(
        'DELETE FROM migration_state WHERE environment = ?',
        [this.environment]
      );

      // Import state
      for (const migrationId of state.appliedMigrations) {
        const migration = allMigrations.find(m => m.id === migrationId);
        if (migration) {
          await this.recordMigration(migration);
        }
      }
    });

    console.log(`Imported migration state for ${this.environment} environment.`);
  }
}

// Export singleton instance
export const migrationManager = new MigrationManager(
  process.env.NODE_ENV === 'production' ? 'production' : 'development'
);