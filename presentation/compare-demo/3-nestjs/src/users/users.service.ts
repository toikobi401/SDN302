import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';

@Injectable()
export class UsersService {
  private users: { id: number; name: string }[] = [];

  create(dto: CreateUserDto) {
    const user = { id: this.users.length + 1, name: dto.name };
    this.users.push(user);
    return user;
  }

  findOne(id: number) {
    const user = this.users.find((u) => u.id === id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
