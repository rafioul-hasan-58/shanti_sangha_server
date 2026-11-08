import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHello(): Promise<string> {
    const userCount = await this.prisma.user.count();
    return `Welcome to SHAVARCHALA SHANTI SANGHA server! (Hello World! ${userCount})`;
  }
  async triggerNotFound() {
    return this.prisma.user.update({
      where: { id: '000000000000000000000000' }, // valid ObjectId format, doesn't exist
      data: { name: 'test' },
    });
  }
}
