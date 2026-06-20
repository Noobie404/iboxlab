import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MockProvidersService } from './mock-providers.service';

@ApiTags('Mock Providers')
@Controller('mock')
export class MockProvidersController {
  constructor(private readonly mockProvidersService: MockProvidersService) {}

  @Get('provider-a')
  @ApiOperation({ summary: 'Mock Provider A flight data' })
  providerA() {
    return this.mockProvidersService.getProviderA();
  }

  @Get('provider-b')
  @ApiOperation({ summary: 'Mock Provider B flight data' })
  providerB() {
    return this.mockProvidersService.getProviderB();
  }

  @Get('provider-c')
  @ApiOperation({ summary: 'Mock Provider C flight data' })
  providerC() {
    return this.mockProvidersService.getProviderC();
  }
}
