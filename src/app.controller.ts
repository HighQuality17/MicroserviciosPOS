import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root() {
    return { ok: true, name: 'MicroserviciosPOS API', version: '0.1' };
  }

  @Get('health')
  health() {
    return { ok: true };
  }
}