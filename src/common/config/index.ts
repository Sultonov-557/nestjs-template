import { cleanEnv, num, str } from 'envalid';
import { config } from 'dotenv';
config();

export const env = cleanEnv(process.env, {
  PORT: num(),
  DB_HOST: str(),
  DB_PORT: num(),
  DB_USER: str(),
  DB_PASS: str(),
  DB_NAME: str(),
  ENV: str(),
});
