import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MembersRepository } from './members.repository';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';

@Module({
  imports: [PrismaModule],
  controllers: [MembersController],
  providers: [MembersRepository, MembersService],
  exports: [MembersRepository, MembersService],
})
export class MembersModule {}
