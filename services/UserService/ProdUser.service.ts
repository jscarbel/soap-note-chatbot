import { Email } from '../../models/email.model';
import { User } from '../../models/user.model';
import { IUserService } from './IUser.service';

export class ProdUserService implements IUserService {
  /** @inheritdoc */
  getUserByEmail(email: Email): Promise<User> {
    throw new Error('Method not implemented.');
  }
}
