export type Role =
  | "CUSTOMER"
  | "ADMIN"
  | "RESTAURANT_MANAGER"
  | "DELIVERY_PARTNER"
  | "SUPPORT_AGENT";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  image?: string | null;
  phoneNumber?: string | null;
  phoneNumberVerified?: boolean;
  dob?: string | null;
  gender?: string | null;
  isVeg?: boolean;
  createdAt: Date;
  updatedAt: Date;
}