# Node Mini Framework

A lightweight, Laravel-inspired Node.js framework with Express, Sequelize, Socket.IO, and Zod validation.

## Introduction

Node Mini Framework is a modern boilerplate for building REST APIs and real-time applications with organized structure. This framework provides:

- Laravel-style routing system via [@refkinscallv/express-routing](https://github.com/refkinscallv/express-routing)
- Automatic model registration with Sequelize ORM
- Standard Zod schema validation
- Built-in logging system with file rotation
- Socket.IO integration for real-time features
- Production-ready configuration

## Installation

### Clone Repository

```bash
git clone https://github.com/refkinscallv/node-mini-framework.git
cd node-mini-framework
```

### Install Dependencies

```bash
npm install
```

### Database Configuration

Edit `src/app/config.js` and adjust database configuration:

```javascript
database: {
    dialect: 'mysql',
    host: 'localhost',
    port: 3306,
    database: 'your_database',
    username: 'your_username',
    password: 'your_password',
    logging: false,
}
```

### Environment Setup

Adjust other configurations in `src/app/config.js`:

```javascript
app: {
    production: false,
    port: 3025,
    url: 'http://localhost:3025',
    name: 'Your App Name',
    timezone: 'UTC',
    log_dir: 'logs',
}
```

## Quick Usage

### 1. Create Model

Create file `src/app/models/product.model.js`:

```javascript
'use strict'

module.exports = (sequelize, DataTypes) => {
    const Product = sequelize.define(
        'Product',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            name: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            price: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false,
            },
            stock: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },
            is_active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },
        },
        {
            tableName: 'products',
            timestamps: true,
            underscored: true,
        }
    )

    Product.associate = (models) => {
        // Define relationships here
        // Product.belongsTo(models.Category, { foreignKey: 'category_id' })
    }

    return Product
}
```

Models will be automatically registered when the application starts.

### 2. Create Validator

Create file `src/app/http/validators/product.validator.js`:

```javascript
'use strict'

const { z } = require('zod')

module.exports = class ProductValidator {
    static create = z.object({
        name: z.string().min(3).max(100),
        price: z.number().positive(),
        stock: z.number().int().min(0).default(0),
        is_active: z.boolean().default(true),
    })

    static update = z.object({
        name: z.string().min(3).max(100).optional(),
        price: z.number().positive().optional(),
        stock: z.number().int().min(0).optional(),
        is_active: z.boolean().optional(),
    })

    static id = z.object({
        id: z.coerce.number().int().positive(),
    })
}
```

### 3. Create Controller

Create file `src/app/http/controllers/product.controller.js`:

```javascript
'use strict'

const Database = require('@core/database.core')
const ProductValidator = require('@app/http/validators/product.validator')

module.exports = class ProductController {
    static async index({ req, res }) {
        try {
            const Product = Database.getModel('Product')
            const products = await Product.findAll({
                order: [['created_at', 'DESC']],
            })

            return res.json({
                success: true,
                data: products,
            })
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message,
            })
        }
    }

    static async show({ req, res }) {
        try {
            const validation = ProductValidator.id.safeParse(req.params)

            if (!validation.success) {
                return res.status(422).json({
                    success: false,
                    errors: validation.error.format(),
                })
            }

            const Product = Database.getModel('Product')
            const product = await Product.findByPk(validation.data.id)

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found',
                })
            }

            return res.json({
                success: true,
                data: product,
            })
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message,
            })
        }
    }

    static async create({ req, res }) {
        try {
            const validation = ProductValidator.create.safeParse(req.body)

            if (!validation.success) {
                return res.status(422).json({
                    success: false,
                    errors: validation.error.format(),
                })
            }

            const Product = Database.getModel('Product')
            const product = await Product.create(validation.data)

            return res.status(201).json({
                success: true,
                message: 'Product created successfully',
                data: product,
            })
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message,
            })
        }
    }

    static async update({ req, res }) {
        try {
            const idValidation = ProductValidator.id.safeParse(req.params)
            const dataValidation = ProductValidator.update.safeParse(req.body)

            if (!idValidation.success || !dataValidation.success) {
                return res.status(422).json({
                    success: false,
                    errors: idValidation.error?.format() || dataValidation.error?.format(),
                })
            }

            const Product = Database.getModel('Product')
            const product = await Product.findByPk(idValidation.data.id)

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found',
                })
            }

            await product.update(dataValidation.data)

            return res.json({
                success: true,
                message: 'Product updated successfully',
                data: product,
            })
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message,
            })
        }
    }

    static async destroy({ req, res }) {
        try {
            const validation = ProductValidator.id.safeParse(req.params)

            if (!validation.success) {
                return res.status(422).json({
                    success: false,
                    errors: validation.error.format(),
                })
            }

            const Product = Database.getModel('Product')
            const product = await Product.findByPk(validation.data.id)

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found',
                })
            }

            await product.destroy()

            return res.json({
                success: true,
                message: 'Product deleted successfully',
            })
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message,
            })
        }
    }
}
```

### 4. Register Routes

Edit `src/app/routes/register.route.js`:

```javascript
'use strict'

const Routes = require('@refkinscallv/express-routing')
const ProductController = require('@app/http/controllers/product.controller')

// API Routes Group
Routes.group('api', () => {
    // Products CRUD
    Routes.get('products', ProductController.index)
    Routes.get('products/:id', ProductController.show)
    Routes.post('products', ProductController.create)
    Routes.put('products/:id', ProductController.update)
    Routes.delete('products/:id', ProductController.destroy)
})
```

### 5. Run Application

Development mode with auto-reload:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

## Routing System

This framework uses [@refkinscallv/express-routing](https://github.com/refkinscallv/express-routing) inspired by Laravel routing.

### Basic Routes

```javascript
const Routes = require('@refkinscallv/express-routing')

// Direct function handler
Routes.get('path', ({ req, res }) => {
    return res.json({ message: 'Hello' })
})

// Static class method
Routes.post('path', ControllerClass.method)

// Instance class method
Routes.put('path', [ControllerClass, 'method'])

// Object method
Routes.delete('path', ControllerObject.method)
```

### Route Groups

```javascript
// Group with prefix
Routes.group('api', () => {
    Routes.get('users', UserController.index) // /api/users
    Routes.get('posts', PostController.index) // /api/posts
})

// Nested groups
Routes.group('api', () => {
    Routes.group('v1', () => {
        Routes.get('users', UserController.index) // /api/v1/users
    })
})
```

### Middleware

```javascript
const AuthMiddleware = require('@app/http/middlewares/auth.middleware')

// Global middleware for specific routes
Routes.middleware([AuthMiddleware.authenticate], () => {
    Routes.get('profile', UserController.profile)
    Routes.put('profile', UserController.update)
})

// Group with middleware
Routes.group('admin', () => {
    Routes.get('dashboard', AdminController.dashboard)
}, [AuthMiddleware.authenticate, AuthMiddleware.isAdmin])
```

### Complete Example

```javascript
'use strict'

const Routes = require('@refkinscallv/express-routing')
const AuthMiddleware = require('@app/http/middlewares/auth.middleware')
const UserController = require('@app/http/controllers/user.controller')
const ProductController = require('@app/http/controllers/product.controller')

// Public routes
Routes.group('api', () => {
    Routes.post('auth/login', ({ req, res }) => {
        // Login logic
        return res.json({ token: 'xxx' })
    })
    
    Routes.post('auth/register', ({ req, res }) => {
        // Register logic
        return res.json({ message: 'Registered' })
    })
})

// Protected routes
Routes.middleware([AuthMiddleware.authenticate], () => {
    Routes.group('api', () => {
        // User routes
        Routes.get('profile', UserController.profile)
        Routes.put('profile', UserController.update)
        
        // Products routes
        Routes.get('products', ProductController.index)
        Routes.get('products/:id', ProductController.show)
        Routes.post('products', ProductController.create)
        Routes.put('products/:id', ProductController.update)
        Routes.delete('products/:id', ProductController.destroy)
    })
})

// Admin routes
Routes.middleware([AuthMiddleware.authenticate, AuthMiddleware.isAdmin], () => {
    Routes.group('api/admin', () => {
        Routes.get('users', UserController.list)
        Routes.delete('users/:id', UserController.delete)
    })
})
```

## Validation

This framework uses standard Zod for schema validation.

### Basic Validation

```javascript
const { z } = require('zod')

const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
})

const result = schema.safeParse(req.body)

if (!result.success) {
    return res.status(422).json({
        success: false,
        errors: result.error.format(),
    })
}

// Use validated data
const { email, password } = result.data
```

### Async Validation

```javascript
const result = await schema.safeParseAsync(req.body)

if (!result.success) {
    return res.status(422).json({
        success: false,
        errors: result.error.format(),
    })
}
```

### Validation Middleware

Create reusable validation middleware:

```javascript
'use strict'

module.exports = class ValidationMiddleware {
    static validate(schema, source = 'body') {
        return (req, res, next) => {
            const result = schema.safeParse(req[source])

            if (!result.success) {
                return res.status(422).json({
                    success: false,
                    message: 'Validation failed',
                    errors: result.error.format(),
                })
            }

            req.validated = result.data
            next()
        }
    }
}
```

Usage:

```javascript
const ValidationMiddleware = require('@app/http/middlewares/validation.middleware')
const ProductValidator = require('@app/http/validators/product.validator')

Routes.post('products',
    ValidationMiddleware.validate(ProductValidator.create),
    ProductController.create
)

// Access validated data in controller
const data = req.validated
```

### Common Patterns

```javascript
const { z } = require('zod')

// ID validation
const idSchema = z.object({
    id: z.coerce.number().int().positive(),
})

// UUID validation
const uuidSchema = z.object({
    id: z.string().uuid(),
})

// Email validation
const emailSchema = z.string().email()

// Pagination schema
const paginationSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
})

// Search schema
const searchSchema = z.object({
    q: z.string().optional(),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('desc'),
})
```

## Database

This framework uses Sequelize ORM with auto-registration for models.

### Model Definition

```javascript
module.exports = (sequelize, DataTypes) => {
    const ModelName = sequelize.define('ModelName', {
        // columns definition
    }, {
        tableName: 'table_name',
        timestamps: true,
        underscored: true,
    })

    ModelName.associate = (models) => {
        // Define associations
    }

    return ModelName
}
```

### Relationships

```javascript
// One-to-Many
User.associate = (models) => {
    User.hasMany(models.Post, { foreignKey: 'user_id' })
}

Post.associate = (models) => {
    Post.belongsTo(models.User, { foreignKey: 'user_id' })
}

// Many-to-Many
User.associate = (models) => {
    User.belongsToMany(models.Role, { 
        through: 'user_roles',
        foreignKey: 'user_id' 
    })
}
```

### Query Examples

```javascript
const Database = require('@core/database.core')
const Product = Database.getModel('Product')

// Find all
const products = await Product.findAll()

// Find by primary key
const product = await Product.findByPk(1)

// Find one
const product = await Product.findOne({ where: { name: 'Product A' } })

// Create
const product = await Product.create({ name: 'New Product', price: 100 })

// Update
await product.update({ price: 150 })

// Delete
await product.destroy()

// With associations
const users = await User.findAll({
    include: [{ model: Post }]
})

// Pagination
const { count, rows } = await Product.findAndCountAll({
    limit: 10,
    offset: 0,
    order: [['created_at', 'DESC']],
})
```

### Transactions

```javascript
const Database = require('@core/database.core')

await Database.transaction(async (t) => {
    const user = await User.create({ name: 'John' }, { transaction: t })
    await Post.create({ user_id: user.id, title: 'Hello' }, { transaction: t })
})
```

### Raw Queries

```javascript
const [results] = await Database.query(
    'SELECT * FROM products WHERE price > ?',
    {
        replacements: [100],
        type: Database.getInstance().QueryTypes.SELECT,
    }
)
```

## Middleware

Middleware can be created as class or object with static methods.

### Create Middleware

Create file `src/app/http/middlewares/auth.middleware.js`:

```javascript
'use strict'

module.exports = class AuthMiddleware {
    static authenticate(req, res, next) {
        const token = req.headers.authorization

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            })
        }

        // Verify token logic here
        // ...

        next()
    }

    static isAdmin(req, res, next) {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Forbidden',
            })
        }

        next()
    }
}
```

### Register Global Middleware

Edit `src/app/http/middlewares/register.middleware.js`:

```javascript
'use strict'

const Logger = require('@core/logger.core')

module.exports = {
    register(app) {
        // Request logger
        app.use((req, res, next) => {
            Logger.info('http', `${req.method} ${req.path}`)
            next()
        })

        // Other global middlewares
    },
}
```

## Socket.IO

This framework includes Socket.IO for real-time features.

### Register Socket Events

Edit `src/app/socket/register.socket.js`:

```javascript
'use strict'

const Socket = require('@core/socket.core')
const Logger = require('@core/logger.core')

const io = Socket.io

io.on('connection', (socket) => {
    Logger.info('socket', `Client connected: ${socket.id}`)

    socket.on('message', (data) => {
        Logger.debug('socket', `Message received: ${JSON.stringify(data)}`)
        
        // Broadcast to all clients
        io.emit('message', data)
        
        // Or send to specific client
        socket.emit('response', { status: 'ok' })
    })

    socket.on('disconnect', () => {
        Logger.info('socket', `Client disconnected: ${socket.id}`)
    })
})
```

### Socket Configuration

Edit socket options in `src/app/config.js`:

```javascript
socket: {
    options: {
        cors: { origin: '*', methods: ['GET', 'POST'] },
        pingInterval: 25000,
        pingTimeout: 60000,
        transports: ['websocket'],
    }
}
```

## Logging

This framework has a built-in logging system with daily file rotation.

### Usage

```javascript
const Logger = require('@core/logger.core')

Logger.info('layer', 'Info message')
Logger.debug('layer', 'Debug message')
Logger.log('layer', 'Log message')
Logger.warning('layer', 'Warning message')
Logger.error('layer', 'Error message')
```

### Log Files

Logs are stored in the folder configured in `config.js` with structure:

```
logs/
  2025-01-01/
    info.log
    debug.log
    error.log
    warning.log
    all.log
  2025-01-02/
    ...
```

## Project Structure

```
node-mini-framework/
├── src/
│   ├── app/
│   │   ├── config.js
│   │   ├── http/
│   │   │   ├── controllers/
│   │   │   ├── middlewares/
│   │   │   │   └── register.middleware.js
│   │   │   └── validators/
│   │   ├── models/
│   │   ├── routes/
│   │   │   └── register.route.js
│   │   └── socket/
│   │       └── register.socket.js
│   ├── core/
│   │   ├── boot.core.js
│   │   ├── database.core.js
│   │   ├── express.core.js
│   │   ├── logger.core.js
│   │   ├── runtime.core.js
│   │   ├── server.core.js
│   │   └── socket.core.js
│   └── index.js
├── logs/
├── package.json
├── nodemon.json
├── jsconfig.json
├── .prettierrc
└── .prettierignore
```

## Configuration

All configuration is in `src/app/config.js`:

```javascript
{
    app: { ... },           // Application config
    server: { ... },        // Server & SSL config
    express: { ... },       // Express & CORS config
    socket: { ... },        // Socket.IO config
    database: { ... },      // Database config
}
```

## Development Tips

1. Use `npm run dev` for development with auto-reload
2. Set `database.logging: true` to see SQL queries
3. Set `app.production: false` for error stack trace
4. Models must use suffix `.model.js`
5. Validators must use suffix `.validator.js`
6. Database sync options:
   - `sync: true` - Sync models with database
   - `force: true` - DROP and recreate tables (DANGER!)
   - `alter: true` - Alter tables according to model changes

## License

MIT

## Author

Refkinscallv

## Repository

[https://github.com/refkinscallv/node-mini-framework](https://github.com/refkinscallv/node-mini-framework)
