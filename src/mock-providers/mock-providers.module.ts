import { Module } from '@nestjs/common';
import { MockProvidersController } from './mock-providers.controller';
import { MockProvidersService } from './mock-providers.service';

@Module({
  controllers: [MockProvidersController],
  providers: [MockProvidersService],
})
export class MockProvidersModule {}
