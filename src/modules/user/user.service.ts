import { Injectable } from '@nestjs/common';
import { Like, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from '../user/dto/update-user.dto';
import { HttpError } from 'src/common/exception/http.error';
import { decrypt, encrypt } from 'src/common/utils/hash/hashing.utils';
import { RegisterUserDto } from './dto/register-user.dto';
import { GetUserQueryDto } from './dto/get-user-query.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { env } from 'src/common/config';
import { sign, verify } from 'jsonwebtoken';
import { compare, hash } from 'bcryptjs';
import { RefreshUserDto } from './dto/refresh-user.dto';
import { Role } from 'src/common/auth/roles/role.enum';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async register(dto: RegisterUserDto) {
    const busyUsername = await this.userRepo.findOneBy({
      username: dto.username,
    });
    if (busyUsername) HttpError({ code: 'BUSY_USERNAME' });

    const user = this.userRepo.create({
      username: dto.username,
      email: dto.email,
      password: encrypt(dto.password),
    });

    const [access_token, refresh_token] = [
      sign({ id: user.id, role: Role.User }, env.ACCESS_TOKEN_SECRET, {
        expiresIn: '2h',
      }),
      sign({ id: user.id, role: Role.User }, env.REFRESH_TOKEN_SECRET, {
        expiresIn: '1d',
      }),
    ];
    user.refresh_token = await hash(refresh_token, 10);
    await this.userRepo.save(user);

    return {
      ...user,
      access_token: access_token,
      refresh_token: refresh_token,
    };
  }

  async delete(id: number) {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) HttpError({ code: 'USER_NOT_FOUND' });
    return (await this.userRepo.delete({ id: user.id })).raw;
  }

  async getAll(query: GetUserQueryDto) {
    const { limit = 10, page = 1, email, username } = query;
    const [result, total] = await this.userRepo.findAndCount({
      where: {
        username: Like(`%${username?.trim() || ''}%`),
        email: Like(`%${email?.trim() || ''}%`),
      },
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });

    return { total, page, limit, data: result };
  }

  async getOne(id: number) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) HttpError({ code: 'USER_NOT_FOUND' });
    return user;
  }

  async login(dto: LoginUserDto) {
    const user = await this.userRepo.findOneBy({ username: dto.username });
    if (!user) return HttpError({ code: 'USER_NOT_FOUND' });

    const passwordMatch = dto.password === decrypt(user.password);
    if (!passwordMatch) HttpError({ code: 'WRONG_PASSWORD' });

    const [access_token, refresh_token] = [
      sign({ id: user.id, role: Role.User }, env.ACCESS_TOKEN_SECRET, {
        expiresIn: '2h',
      }),
      sign({ id: user.id, role: Role.User }, env.REFRESH_TOKEN_SECRET, {
        expiresIn: '1d',
      }),
    ];

    await this.userRepo.update(
      { id: user.id },
      {
        refresh_token: await hash(refresh_token, 10),
      },
    );

    return {
      ...user,
      access_token: access_token,
      refresh_token: refresh_token,
    };
  }

  async logout(id: number) {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) HttpError({ code: 'USER_NOT_FOUND' });
    user.refresh_token = null;
    return await this.userRepo.save(user);
  }

  async refresh(dto: RefreshUserDto) {
    const token = dto.refresh_token;
    const userData = verify(token, env.REFRESH_TOKEN_SECRET) as {
      id: number;
      role: string;
    };
    if (!userData) HttpError({ code: 'LOGIN_FAILED' });

    const user = await this.userRepo.findOneBy({ id: +userData.id });
    if (!user) HttpError({ code: 'USER_NOT_FOUND' });

    const isRefTokenMatch = await compare(
      dto.refresh_token,
      user.refresh_token,
    );
    if (!isRefTokenMatch) HttpError({ code: 'WRONG_REFRESH_TOKEN' });

    const access_token = sign(
      { id: user.id, role: Role.User },
      env.ACCESS_TOKEN_SECRET,
      { expiresIn: '2h' },
    );
    return { ...user, access_token: access_token };
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) return HttpError({ code: 'USER_NOT_FOUND' });

    for (const key in user) {
      if (Object.prototype.hasOwnProperty.call(dto, key)) user[key] = dto[key];
    }

    if (dto.password) {
      user.password = encrypt(dto.password);
    }

    if (dto.username && dto.username !== user.username) {
      const busyUsername = await this.userRepo.findOneBy({
        username: dto.username,
      });
      if (busyUsername) HttpError({ code: 'BUSY_USERNAME' });
    }

    return await this.userRepo.save(user);
  }
}
