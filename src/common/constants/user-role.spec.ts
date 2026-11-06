import 'reflect-metadata';
import { BorrowRecordsController } from '../../modules/borrow-records/borrow-records.controller';
import { BooksController } from '../../modules/books/books.controller';
import { UsersController } from '../../modules/users/users.controller';
import { COUNTER_ROLES, INVENTORY_ROLES, STAFF_ROLES, UserRole } from './user-role';

describe('staff role permissions', () => {
  it('keeps admins and legacy librarians compatible with both staff areas', () => {
    expect(COUNTER_ROLES).toContain(UserRole.ADMIN);
    expect(COUNTER_ROLES).toContain(UserRole.LIBRARIAN);
    expect(INVENTORY_ROLES).toContain(UserRole.ADMIN);
    expect(INVENTORY_ROLES).toContain(UserRole.LIBRARIAN);
  });

  it('separates counter and inventory librarian permissions', () => {
    expect(COUNTER_ROLES).toContain(UserRole.COUNTER_LIBRARIAN);
    expect(COUNTER_ROLES).not.toContain(UserRole.INVENTORY_LIBRARIAN);
    expect(INVENTORY_ROLES).toContain(UserRole.INVENTORY_LIBRARIAN);
    expect(INVENTORY_ROLES).not.toContain(UserRole.COUNTER_LIBRARIAN);
    expect(STAFF_ROLES).toEqual(expect.arrayContaining([
      UserRole.ADMIN,
      UserRole.LIBRARIAN,
      UserRole.COUNTER_LIBRARIAN,
      UserRole.INVENTORY_LIBRARIAN,
    ]));
  });

  it('applies the matching role sets to inventory, circulation, and reader APIs', () => {
    expect(Reflect.getMetadata('roles', BooksController.prototype.create)).toEqual(INVENTORY_ROLES);
    expect(Reflect.getMetadata('roles', BorrowRecordsController.prototype.approve)).toEqual(COUNTER_ROLES);
    expect(Reflect.getMetadata('roles', UsersController.prototype.create)).toEqual(COUNTER_ROLES);
  });
});
