import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { User } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from './entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private withoutPassword(user: User) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
      avatarUrl: user.avatarUrl,
    };
  }

  @Roles(Role.ADMIN)
  @Get()
  async list() {
    const users = await this.usersService.findAll();
    return users.map((user) => this.withoutPassword(user));
  }

  @Get('me')
  async getProfile(@CurrentUser() user: { id: string }) {
    return this.withoutPassword(await this.usersService.findOne(user.id));
  }

  @UsePipes(new ValidationPipe({ whitelist: true }))
  @Patch('me')
  async updateProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.withoutPassword(
      await this.usersService.updateProfile(user.id, dto),
    );
  }

  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List users' })
  @ApiResponse({ status: 200, description: 'Array of users', type: [User] })
  @Get(':id')
  async get(@Param('id') id: string) {
    return this.withoutPassword(await this.usersService.findOne(id));
  }

  @ApiOperation({ summary: 'Get user by id' })
  @ApiResponse({ status: 200, description: 'User object', type: User })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'Created user', type: User })
  async create(@Body() dto: CreateUserDto) {
    return this.withoutPassword(await this.usersService.create(dto));
  }

  @UsePipes(new ValidationPipe({ whitelist: true }))
  @Roles(Role.ADMIN)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.withoutPassword(await this.usersService.update(id, dto));
  }

  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({ status: 200, description: 'Updated user', type: User })
  @Roles(Role.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return { ok: true };
  }
}
