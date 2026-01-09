// Debug seed users - only for development
// All users have the password: Debug123!

export const DEBUG_PASSWORD = 'Debug123!';

export interface SeedUser {
  email: string;
  username: string;
  fullName: string;
}

export const SEED_USERS: SeedUser[] = [
  { email: 'alice@debug.earshot', username: 'alice_dev', fullName: 'Alice Anderson' },
  { email: 'bob@debug.earshot', username: 'bob_dev', fullName: 'Bob Brown' },
  { email: 'charlie@debug.earshot', username: 'charlie_dev', fullName: 'Charlie Chen' },
  { email: 'diana@debug.earshot', username: 'diana_dev', fullName: 'Diana Davis' },
  { email: 'evan@debug.earshot', username: 'evan_dev', fullName: 'Evan Evans' },
  { email: 'fiona@debug.earshot', username: 'fiona_dev', fullName: 'Fiona Foster' },
  { email: 'george@debug.earshot', username: 'george_dev', fullName: 'George Garcia' },
  { email: 'hannah@debug.earshot', username: 'hannah_dev', fullName: 'Hannah Hill' },
  { email: 'ivan@debug.earshot', username: 'ivan_dev', fullName: 'Ivan Ivanov' },
  { email: 'julia@debug.earshot', username: 'julia_dev', fullName: 'Julia Jones' },
];
