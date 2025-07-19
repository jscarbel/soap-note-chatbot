import { Email } from '../../models/email.model';
import { User } from '../../models/user.model';
import { NotImplementedError } from '../../utils/errors';
import { IUserService } from './IUser.service';

export class MockUserService implements IUserService {
  /** @inheritdoc */
  getUserByEmail(email: Email): Promise<User> {
    throw new NotImplementedError();
  }
}
