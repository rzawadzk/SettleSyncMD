import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().default('sqlite://dev.db'),

  JWT_SECRET: z.string().min(16),
  HMAC_SECRET: z.string().min(16),
  JWT_EXPIRY_MINUTES: z.coerce.number().default(15),
  REFRESH_TOKEN_EXPIRY_DAYS: z.coerce.number().default(7),

  SMTP_HOST: z.string().default('smtp.ethereal.email'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.string().transform(v => v === 'true').default('false'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default('noreply@settlesync.local'),
  SMTP_FROM_NAME: z.string().default('SettleSync'),

  APP_URL: z.string().url().default('http://localhost:5173'),
  API_URL: z.string().url().default('http://localhost:3001'),

  TOKEN_TTL_HOURS: z.coerce.number().default(72),
  REMINDER_BEFORE_HOURS: z.coerce.number().default(24),

  MAX_UPLOAD_MB: z.coerce.number().default(10),
  UPLOAD_DIR: z.string().default('./uploads'),
  ALLOWED_FILE_TYPES: z.string().default(
    'application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_AUTH: z.coerce.number().default(10),
  RATE_LIMIT_PARTY: z.coerce.number().default(5),
  RATE_LIMIT_GENERAL: z.coerce.number().default(30),

  WEBHOOK_URL: z.string().url().optional(),
  WEBHOOK_SECRET: z.string().optional(),

  ADMIN_EMAILS: z.string().default('admin@settlesync.local'),
});

function loadConfig() {
  const result = ConfigSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid configuration:');
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();

export type Config = z.infer<typeof ConfigSchema>;
