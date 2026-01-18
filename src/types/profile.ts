/**
 * User profile data shape used across the app
 * This is a subset of the full User type, containing only display/profile information
 */
export interface Profile {
  id: string;
  username: string;
  fullName: string;
  profilePhotoUrl: string | null;
}

export type GetProfileByIdFn = (userId: string) => Profile | undefined;
