#!/usr/bin/env node

/**
 * Key Rotation Worker
 * 
 * Runs every 24 hours to:
 * 1. Check which secrets need rotation (quarterly = 90 days)
 * 2. Trigger rotation workflows
 * 3. Log rotation audit
 * 
 * Can be deployed as:
 * - Cloud Scheduler job (recommended for production)
 * - Background worker in Kubernetes
 * - Cron job on VM
 * 
 * Usage:
 *   node scripts/rotate-secrets-worker.mjs
 *   
 * Environment variables:
 *   GCP_PROJECT_ID - GCP project ID
 *   ROTATION_CHECK_ENABLED - Enable/disable (default: true)
 *   ROTATION_SCHEDULE_DAYS - Days between rotations (default: 90)
 * 
 * @author Philips Medical - Healthcare Security
 */

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

const secretClient = new SecretManagerServiceClient();
const projectId = process.env.GCP_PROJECT_ID || 'nuvita-499800';
const rotationScheduleDays = parseInt(process.env.ROTATION_SCHEDULE_DAYS || '90', 10);

interface SecretRotationPolicy {
  name: string;
  rotationIntervalDays: number;
  requiresManualRotation: boolean;
  description: string;
}

const ROTATION_POLICIES: SecretRotationPolicy[] = [
  {
    name: 'jwt-access-secret',
    rotationIntervalDays: 90,
    requiresManualRotation: false,
    description: 'JWT access token secret',
  },
  {
    name: 'jwt-refresh-secret',
    rotationIntervalDays: 90,
    requiresManualRotation: false,
    description: 'JWT refresh token secret',
  },
  {
    name: 'bootstrap-secret',
    rotationIntervalDays: 90,
    requiresManualRotation: true,
    description: 'CLI bootstrap secret',
  },
  {
    name: 'prontuario-signature-secret',
    rotationIntervalDays: 180,
    requiresManualRotation: true,
    description: 'Prontuário signature secret',
  },
  {
    name: 'patient-data-encryption-key',
    rotationIntervalDays: 365,
    requiresManualRotation: true,
    description: 'Patient data encryption key (annual)',
  },
  {
    name: 'document-storage-access-key-id',
    rotationIntervalDays: 180,
    requiresManualRotation: true,
    description: 'Document storage access key',
  },
];

interface RotationResult {
  secretName: string;
  status: 'rotated' | 'not-needed' | 'error' | 'manual-required';
  reason: string;
  lastRotated: Date;
  nextRotation: Date;
}

/**
 * Get secret metadata (creation time, labels)
 */
async function getSecretMetadata(secretName: string) {
  try {
    const name = `projects/${projectId}/secrets/${secretName}`;
    const [secret] = await secretClient.getSecret({ name });
    return secret;
  } catch (error) {
    if (error.code === 5) {
      return null; // Secret doesn't exist
    }
    throw error;
  }
}

/**
 * Check if secret needs rotation
 */
function needsRotation(
  lastRotatedDate: Date,
  rotationIntervalDays: number,
): boolean {
  const now = new Date();
  const daysSinceRotation = Math.floor(
    (now.getTime() - lastRotatedDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  return daysSinceRotation >= rotationIntervalDays;
}

/**
 * Generate new secret value based on secret type
 */
function generateNewSecret(secretName: string): string {
  if (secretName.includes('key')) {
    return crypto.randomBytes(32).toString('base64');
  }
  if (secretName.includes('secret')) {
    return crypto.randomBytes(32).toString('hex');
  }
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Rotate a secret (create new version)
 */
async function rotateSecret(secretName: string): Promise<boolean> {
  try {
    const newValue = generateNewSecret(secretName);
    const parent = `projects/${projectId}/secrets/${secretName}`;

    const [version] = await secretClient.addSecretVersion({
      parent,
      payload: {
        data: Buffer.from(newValue),
      },
    });

    console.log(chalk.green(`✓ Rotated: ${secretName}`));
    console.log(`  New version: ${version.name}`);
    console.log(`  Value: ${newValue.substring(0, 20)}...`);

    return true;
  } catch (error) {
    console.error(chalk.red(`✗ Failed to rotate ${secretName}:`), error.message);
    return false;
  }
}

/**
 * Create rotation audit log
 */
async function logRotationAudit(results: RotationResult[]): Promise<void> {
  const auditLog = {
    timestamp: new Date().toISOString(),
    projectId,
    results,
    summary: {
      total: results.length,
      rotated: results.filter((r) => r.status === 'rotated').length,
      notNeeded: results.filter((r) => r.status === 'not-needed').length,
      manualRequired: results.filter((r) => r.status === 'manual-required').length,
      errors: results.filter((r) => r.status === 'error').length,
    },
  };

  // Log to Cloud Logging
  console.log('\n📊 Rotation Audit Summary:');
  console.log(JSON.stringify(auditLog, null, 2));

  // Save local backup (for development)
  const logFile = path.join(
    process.cwd(),
    'logs',
    `rotation-audit-${new Date().toISOString().split('T')[0]}.json`,
  );

  try {
    const logsDir = path.dirname(logFile);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    fs.writeFileSync(logFile, JSON.stringify(auditLog, null, 2));
    console.log(`\n📝 Audit log saved: ${logFile}`);
  } catch (error) {
    console.warn(`⚠️ Failed to save audit log: ${error.message}`);
  }
}

/**
 * Main rotation worker
 */
async function runRotationWorker(): Promise<void> {
  console.log(chalk.blue.bold('\n🔄 Nuvita - Secret Rotation Worker'));
  console.log(chalk.blue('=====================================\n'));

  console.log(`Project: ${projectId}`);
  console.log(`Rotation interval: ${rotationScheduleDays} days`);
  console.log(`Run time: ${new Date().toISOString()}\n`);

  const results: RotationResult[] = [];

  for (const policy of ROTATION_POLICIES) {
    console.log(`\n📋 Checking: ${policy.name}`);

    try {
      const secret = await getSecretMetadata(policy.name);

      if (!secret) {
        console.log(chalk.yellow(`  ⚠️ Secret not found`));
        results.push({
          secretName: policy.name,
          status: 'error',
          reason: 'Secret not found in GCP',
          lastRotated: new Date(),
          nextRotation: new Date(),
        });
        continue;
      }

      const lastRotatedDate = secret.createTime?.toDate() || new Date();
      const nextRotationDate = new Date(lastRotatedDate);
      nextRotationDate.setDate(nextRotationDate.getDate() + policy.rotationIntervalDays);

      if (policy.requiresManualRotation) {
        console.log(
          chalk.yellow(`  ⚠️ Manual rotation required`),
        );
        results.push({
          secretName: policy.name,
          status: 'manual-required',
          reason: 'Manual rotation required for this secret',
          lastRotated: lastRotatedDate,
          nextRotation: nextRotationDate,
        });
        continue;
      }

      if (needsRotation(lastRotatedDate, policy.rotationIntervalDays)) {
        console.log(chalk.yellow(`  Days since rotation: ${Math.floor((new Date().getTime() - lastRotatedDate.getTime()) / (1000 * 60 * 60 * 24))}`));
        const rotated = await rotateSecret(policy.name);

        results.push({
          secretName: policy.name,
          status: rotated ? 'rotated' : 'error',
          reason: rotated ? `Rotated successfully` : 'Rotation failed',
          lastRotated: lastRotatedDate,
          nextRotation: new Date(),
        });
      } else {
        const daysRemaining = Math.floor(
          (nextRotationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
        );
        console.log(chalk.green(`  ✓ Not needed (${daysRemaining} days remaining)`));

        results.push({
          secretName: policy.name,
          status: 'not-needed',
          reason: `Next rotation in ${daysRemaining} days`,
          lastRotated: lastRotatedDate,
          nextRotation: nextRotationDate,
        });
      }
    } catch (error) {
      console.error(chalk.red(`  ✗ Error: ${error.message}`));
      results.push({
        secretName: policy.name,
        status: 'error',
        reason: error.message,
        lastRotated: new Date(),
        nextRotation: new Date(),
      });
    }
  }

  // Log audit
  await logRotationAudit(results);

  // Summary
  console.log(chalk.blue.bold('\n✅ Rotation worker completed'));
}

// Run worker
runRotationWorker().catch((error) => {
  console.error(chalk.red('❌ Worker failed:'), error);
  process.exit(1);
});
