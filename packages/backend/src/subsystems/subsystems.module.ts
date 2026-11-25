import { Module } from '@nestjs/common';
import { SubsystemsController } from './subsystems.controller';
import { SubsystemsService } from './subsystems.service';

@Module({
  controllers: [SubsystemsController],
  providers: [SubsystemsService],
})
export class SubsystemsModule {}
