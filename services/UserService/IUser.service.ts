import { Email } from '../../models/email.model';
import { User } from '../../models/user.model';

export interface IUserService {
  getUserByEmail(email: Email): Promise<User>;
}
