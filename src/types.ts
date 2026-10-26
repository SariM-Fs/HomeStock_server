import { CATEGORIES, PERMISSIONS, ROLES, STATUSES, UNITS } from './constants';

export type Category = (typeof CATEGORIES)[number];
export type Unit = (typeof UNITS)[number];
export type ProductStatus = (typeof STATUSES)[number];
export type Role = (typeof ROLES)[number];
export type Permission = (typeof PERMISSIONS)[number];

/** User as stored in the database (internal only). */
export interface UserRecord {
  id: number;
  familyId: number;
  username: string;
  passwordHash: string;
  displayName: string;
  role: Role;
  canUpdateQuantity: boolean;
  canAddToShoppingList: boolean;
  canMarkPurchased: boolean;
}

/** User as sent to the client: never includes the password hash. */
export type User = Omit<UserRecord, 'passwordHash'>;

export interface Family {
  id: number;
  name: string;
  /** Invite code: a new member enters it on registration to join this family. */
  code: string;
}

/** Product as stored in the database (status is never stored). */
export interface ProductRecord {
  id: number;
  name: string;
  category: Category;
  quantity: number;
  minimumQuantity: number;
  unit: Unit;
}

/** Product as sent to the client, with the computed status. */
export interface Product extends ProductRecord {
  status: ProductStatus;
}

export interface ShoppingItemRecord {
  id: number;
  productId: number;
  quantity: number;
  purchased: boolean;
  addedAutomatically: boolean;
}

export interface ShoppingItem extends ShoppingItemRecord {
  product: Product;
}

export interface ProductInput {
  name: string;
  category: Category;
  quantity: number;
  minimumQuantity: number;
  unit: Unit;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
