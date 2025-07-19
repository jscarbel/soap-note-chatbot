import { classResolver } from '../classResolver';
import { IUserService } from './IUser.service';
import { MockUserService } from './MockUser.service';
import { ProdUserService } from './ProdUser.service';

const UserService = classResolver<IUserService>(
  ProdUserService,
  MockUserService,
);

export { UserService };
