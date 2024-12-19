import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseConfig } from './common/database/database.config';

@Module({
  imports: [TypeOrmModule.forRoot(DatabaseConfig)],
  controllers: [],
  providers: [],
})
export class AppModule {}
