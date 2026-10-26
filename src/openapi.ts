import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
  RouteConfig,
} from '@asteasolutions/zod-to-openapi';
import { z, ZodTypeAny } from 'zod';
import { CATEGORIES, ROLES, STATUSES, UNITS } from './constants';
import { loginSchema, registerSchema } from './schemas/authSchemas';
import { idParamSchema } from './schemas/common';
import { productQuerySchema, productSchema, quantitySchema } from './schemas/productSchemas';
import { addItemSchema, shoppingQuerySchema, updateItemSchema } from './schemas/shoppingSchemas';
import { permissionsSchema } from './schemas/userSchemas';

// Builds the OpenAPI document from the same zod schemas the routes validate with,
// so the docs can't drift from the actual validation rules.
extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

// --- Response models ---

const User = registry.register(
  'User',
  z.object({
    id: z.number().int(),
    familyId: z.number().int(),
    username: z.string(),
    displayName: z.string(),
    role: z.enum(ROLES),
    canUpdateQuantity: z.boolean(),
    canAddToShoppingList: z.boolean(),
    canMarkPurchased: z.boolean(),
  }),
);

const Family = registry.register(
  'Family',
  z.object({
    id: z.number().int(),
    name: z.string(),
    code: z.string().openapi({ description: 'Invite code: new members enter it on registration to join' }),
  }),
);

const AuthResult = registry.register('AuthResult', z.object({ token: z.string(), user: User, family: Family }));

const CurrentUser = registry.register('CurrentUser', User.extend({ family: Family }));

const Product = registry.register(
  'Product',
  z.object({
    id: z.number().int(),
    name: z.string(),
    category: z.enum(CATEGORIES),
    quantity: z.number(),
    minimumQuantity: z.number(),
    unit: z.enum(UNITS),
    status: z.enum(STATUSES).openapi({ description: 'Computed: תקין / נמוך / חסר' }),
  }),
);

const ShoppingItem = registry.register(
  'ShoppingItem',
  z.object({
    id: z.number().int(),
    productId: z.number().int(),
    quantity: z.number(),
    purchased: z.boolean(),
    addedAutomatically: z.boolean(),
    product: Product,
  }),
);

const Meta = registry.register(
  'Meta',
  z.object({ categories: z.array(z.enum(CATEGORIES)), units: z.array(z.enum(UNITS)), statuses: z.array(z.enum(STATUSES)) }),
);

const ErrorResponse = registry.register(
  'Error',
  z.object({
    error: z.object({
      code: z.enum(['VALIDATION_ERROR', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'SERVER_ERROR']),
      message: z.string(),
      fields: z.record(z.string()).optional(),
    }),
  }),
);

// --- Request bodies ---

registry.register('LoginBody', loginSchema);
registry.register('RegisterBody', registerSchema);
registry.register('ProductBody', productSchema);
registry.register('QuantityBody', quantitySchema);
registry.register('AddItemBody', addItemSchema);
registry.register('UpdateItemBody', updateItemSchema);
registry.register('PermissionsBody', permissionsSchema);

// --- Helpers ---

const json = (schema: ZodTypeAny, description: string) => ({
  description,
  content: { 'application/json': { schema } },
});

const body = (schema: ZodTypeAny) => ({ body: { content: { 'application/json': { schema } } } });

const errors = {
  400: json(ErrorResponse, 'Validation error'),
  401: json(ErrorResponse, 'Missing or invalid token'),
  403: json(ErrorResponse, 'Not allowed'),
  404: json(ErrorResponse, 'Not found'),
  409: json(ErrorResponse, 'Conflict'),
};


/** Registers a route that requires a Bearer token. */
function secured(route: RouteConfig) {
  registry.registerPath({ security: [{ [bearerAuth.name]: [] }], ...route });
}

// --- Auth ---

registry.registerPath({
  method: 'post',
  path: '/auth/login',
  tags: ['Auth'],
  request: body(loginSchema),
  responses: { 200: json(AuthResult, 'Logged in'), 400: errors[400], 401: errors[401] },
});

registry.registerPath({
  method: 'post',
  path: '/auth/register',
  tags: ['Auth'],
  description:
    'Send exactly one of familyName (creates a new family, the user becomes its Admin) ' +
    'or familyCode (joins an existing family as a regular member).',
  request: body(registerSchema),
  responses: { 201: json(AuthResult, 'Registered'), 400: errors[400], 409: errors[409] },
});

secured({
  method: 'get',
  path: '/auth/me',
  tags: ['Auth'],
  responses: { 200: json(CurrentUser, 'Current user with their family'), 401: errors[401] },
});

// --- Products ---

secured({
  method: 'get',
  path: '/products',
  tags: ['Products'],
  request: { query: productQuerySchema },
  responses: { 200: json(z.array(Product), 'Product list'), 400: errors[400], 401: errors[401] },
});

secured({
  method: 'get',
  path: '/products/{id}',
  tags: ['Products'],
  request: { params: idParamSchema },
  responses: { 200: json(Product, 'Product'), 401: errors[401], 404: errors[404] },
});

secured({
  method: 'post',
  path: '/products',
  tags: ['Products'],
  description: 'Admin only.',
  request: body(productSchema),
  responses: { 201: json(Product, 'Created'), 400: errors[400], 401: errors[401], 403: errors[403], 409: errors[409] },
});

secured({
  method: 'put',
  path: '/products/{id}',
  tags: ['Products'],
  description: 'Admin only.',
  request: { params: idParamSchema, ...body(productSchema) },
  responses: {
    200: json(Product, 'Updated'),
    400: errors[400],
    401: errors[401],
    403: errors[403],
    404: errors[404],
    409: errors[409],
  },
});

secured({
  method: 'patch',
  path: '/products/{id}/quantity',
  tags: ['Products'],
  description: 'Requires the canUpdateQuantity permission.',
  request: { params: idParamSchema, ...body(quantitySchema) },
  responses: { 200: json(Product, 'Updated'), 400: errors[400], 401: errors[401], 403: errors[403], 404: errors[404] },
});

secured({
  method: 'delete',
  path: '/products/{id}',
  tags: ['Products'],
  description: 'Admin only.',
  request: { params: idParamSchema },
  responses: { 204: { description: 'Deleted' }, 401: errors[401], 403: errors[403], 404: errors[404] },
});

// --- Shopping list ---

secured({
  method: 'get',
  path: '/shopping-list',
  tags: ['Shopping list'],
  request: { query: shoppingQuerySchema },
  responses: { 200: json(z.array(ShoppingItem), 'Shopping list'), 400: errors[400], 401: errors[401] },
});

secured({
  method: 'post',
  path: '/shopping-list',
  tags: ['Shopping list'],
  description: 'Requires the canAddToShoppingList permission.',
  request: body(addItemSchema),
  responses: {
    201: json(ShoppingItem, 'Added'),
    400: errors[400],
    401: errors[401],
    403: errors[403],
    404: errors[404],
    409: errors[409],
  },
});

secured({
  method: 'put',
  path: '/shopping-list/{id}',
  tags: ['Shopping list'],
  description: 'Requires the canMarkPurchased permission.',
  request: { params: idParamSchema, ...body(updateItemSchema) },
  responses: { 200: json(ShoppingItem, 'Updated'), 400: errors[400], 401: errors[401], 403: errors[403], 404: errors[404] },
});

secured({
  method: 'delete',
  path: '/shopping-list/{id}',
  tags: ['Shopping list'],
  description: 'Admin only.',
  request: { params: idParamSchema },
  responses: { 204: { description: 'Deleted' }, 401: errors[401], 403: errors[403], 404: errors[404] },
});

// --- Users (admin only) ---

secured({
  method: 'get',
  path: '/users',
  tags: ['Users'],
  description: 'Admin only.',
  responses: { 200: json(z.array(User), "Members of the admin's family"), 401: errors[401], 403: errors[403] },
});

secured({
  method: 'put',
  path: '/users/{id}/permissions',
  tags: ['Users'],
  description: 'Admin only.',
  request: { params: idParamSchema, ...body(permissionsSchema) },
  responses: { 200: json(User, 'Updated'), 400: errors[400], 401: errors[401], 403: errors[403], 404: errors[404] },
});

// --- Meta ---

secured({
  method: 'get',
  path: '/meta',
  tags: ['Meta'],
  description: 'Selectable lists for the client.',
  responses: { 200: json(Meta, 'Categories, units and statuses'), 401: errors[401] },
});

export const openApiDocument = new OpenApiGeneratorV3(registry.definitions).generateDocument({
  openapi: '3.0.3',
  info: { title: 'Home Inventory API', version: '1.0.0', description: 'REST API for home inventory and shopping list' },
});
