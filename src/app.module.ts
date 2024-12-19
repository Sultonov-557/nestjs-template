import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: {
        PORT: Joi.number(),
        DB_HOST: Joi.string().hostname(),
        DB_PORT: Joi.number(),
        DB_USER: Joi.string(),
        DB_PASS: Joi.string(),
        DB_NAME: Joi.string(),
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
