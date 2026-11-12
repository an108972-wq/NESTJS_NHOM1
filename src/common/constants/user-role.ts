export enum UserRole {
  ADMIN = 'ADMIN',
  LIBRARIAN = 'LIBRARIAN',
  COUNTER_LIBRARIAN = 'COUNTER_LIBRARIAN',
  INVENTORY_LIBRARIAN = 'INVENTORY_LIBRARIAN',
  READER = 'READER',
}

export const STAFF_ROLES = [
  UserRole.ADMIN,
  UserRole.LIBRARIAN,
  UserRole.COUNTER_LIBRARIAN,
  UserRole.INVENTORY_LIBRARIAN,
];

export const COUNTER_ROLES = [
  UserRole.ADMIN,
  UserRole.LIBRARIAN,
  UserRole.COUNTER_LIBRARIAN,
];

export const INVENTORY_ROLES = [
  UserRole.ADMIN,
  UserRole.LIBRARIAN,
  UserRole.INVENTORY_LIBRARIAN,
];

export const ALL_ROLES = [
  UserRole.ADMIN,
  UserRole.LIBRARIAN,
  UserRole.COUNTER_LIBRARIAN,
  UserRole.INVENTORY_LIBRARIAN,
  UserRole.READER,
];

export enum ReaderGroup {
  STUDENT = 'STUDENT',
  LECTURER = 'LECTURER',
  RESEARCHER = 'RESEARCHER',
  OTHER = 'OTHER',
}

export const READER_GROUP_LIMITS: Record<string, { name: string; maxActiveLoans: number; durationDays: number }> = {
  [ReaderGroup.STUDENT]: { name: 'Sinh viên', maxActiveLoans: 5, durationDays: 14 },
  [ReaderGroup.LECTURER]: { name: 'Giảng viên', maxActiveLoans: 15, durationDays: 30 },
  [ReaderGroup.RESEARCHER]: { name: 'Nghiên cứu sinh', maxActiveLoans: 10, durationDays: 21 },
  [ReaderGroup.OTHER]: { name: 'Khác', maxActiveLoans: 5, durationDays: 14 },
};
