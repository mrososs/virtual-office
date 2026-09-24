import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findById(userId: string): Promise<User | null> {
    // TODO: query the `users` table via `this.supabaseService.client`.
    void userId;
    return null;
  }

  async findByEmail(email: string): Promise<User | null> {
    // TODO: query the `users` table by unique email.
    void email;
    return null;
  }

  async create(input: Pick<User, 'organizationId' | 'email'>): Promise<User> {
    // TODO: insert into `users` and return the created row.
    throw new Error('Not implemented');
  }
}
