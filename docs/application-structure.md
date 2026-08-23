# GengeSmart Application Structure

## Page format conventions

- **Dashboard**: summary metrics, recent activity, and primary next actions.
- **List page**: page title, short context line, search/filter toolbar, loading/error/empty states, then a table or card list.
- **Detail page**: back navigation, object summary, status, related records, and focused actions.
- **Form page**: one clear form, grouped fields, inline validation, submit state, success/error feedback, and a cancel/back action.
- **Workflow page**: a small number of ordered steps, persistent summary, and one final action.
- **Utility page**: one focused task such as notifications, tracking, or unauthorized access.

All protected pages should use their role layout, preserve mobile-safe widths, and expose loading, error, and empty states.

## Routes by role

### Public and auth

| Route              | Component             | Format        | Purpose                                              |
| ------------------ | --------------------- | ------------- | ---------------------------------------------------- |
| `/`                | `Dashboard` redirect  | Utility       | Sends a signed-in user to the correct role area.     |
| `/login`           | `auth/Login`          | Form          | Authenticate a user.                                 |
| `/register`        | `auth/Register`       | Form          | Create a buyer or seller account.                    |
| `/forgot-password` | `auth/ForgotPassword` | Form workflow | Request a password reset.                            |
| `/unauthorized`    | `Unauthorized`        | Utility       | Explain denied access and provide a safe route back. |

### Buyer

| Route                  | Component              | Format               | Purpose                                                                                     |
| ---------------------- | ---------------------- | -------------------- | ------------------------------------------------------------------------------------------- |
| `/buyer/home`          | `buyer/Home`           | Marketplace page     | Live seller catalog, product cards, cart sidebar, and search/filtering.                     |
| `/buyer/product/:id`   | `buyer/ProductDetails` | Detail page          | Product information, seller information, and add-to-cart action.                            |
| `/buyer/cart`          | `buyer/Cart`           | Workflow page        | Review items, change quantities, remove items, and continue to checkout.                    |
| `/buyer/checkout`      | `buyer/Checkout`       | Form workflow        | Shipping details, admin payment destination, order submission, and payment record creation. |
| `/buyer/orders`        | `buyer/Orders`         | List page            | Show buyer orders and line items.                                                           |
| `/buyer/tracking`      | `buyer/Tracking`       | Detail/list workflow | Show order status, delivery agent location, and tracking events.                            |
| `/buyer/addresses`     | `buyer/Addresses`      | CRUD form page       | Load, add, edit, delete, and select default shipping addresses.                             |
| `/buyer/profile`       | `buyer/Profile`        | Form page            | Edit profile fields and upload an avatar.                                                   |
| `/buyer/notifications` | `buyer/Notifications`  | List/utility page    | Read and mark buyer notifications.                                                          |

Buyer shared format: `BuyerLayout` provides the responsive navbar, search, footer, and page width. Buyer pages should use one primary action per view and keep destructive actions visually secondary.

### Seller

| Route                      | Component              | Format                | Purpose                                                   |
| -------------------------- | ---------------------- | --------------------- | --------------------------------------------------------- |
| `/seller/dashboard`        | `seller/Dashboard`     | Dashboard             | Seller metrics, orders, and inventory signals.            |
| `/seller/add-product`      | `seller/AddProduct`    | Form                  | Create a product and optionally upload its image.         |
| `/seller/edit-product/:id` | `seller/EditProduct`   | Form                  | Update a seller-owned product.                            |
| `/seller/inventory`        | `seller/ProductManage` | List/management page  | Search, filter, stock, status, edit, and delete products. |
| `/seller/orders`           | `seller/Orders`        | List/management page  | Review seller orders and update statuses.                 |
| `/seller/orders/:id`       | `seller/OrderDetails`  | Detail/workflow page  | Inspect an order and update fulfillment/tracking.         |
| `/seller/analytics`        | `seller/Analytics`     | Dashboard/report page | Revenue and order analytics.                              |
| `/seller/profile`          | `seller/Profile`       | Form page             | Update seller account and business details.               |

### Admin

| Route                   | Component              | Format                     | Purpose                                               |
| ----------------------- | ---------------------- | -------------------------- | ----------------------------------------------------- |
| `/admin/dashboard`      | `admin/Dashboard`      | Dashboard                  | Platform metrics and operational signals.             |
| `/admin/users`          | `admin/ManageUsers`    | List/management page       | Search and update user status.                        |
| `/admin/sellers`        | `admin/ManageSellers`  | List/management page       | Approve, suspend, and inspect sellers.                |
| `/admin/products`       | `admin/ManageProducts` | List/management page       | Review and remove catalog products.                   |
| `/admin/agents`         | `admin/ManageAgents`   | CRUD management page       | Create, edit, activate, and remove delivery agents.   |
| `/admin/fraud-alerts`   | `admin/FraudAlerts`    | List/action page           | Review and resolve fraud alerts.                      |
| `/admin/quality-scores` | `admin/QualityScores`  | Report/list page           | Review seller quality scores.                         |
| `/admin/reports`        | `admin/Reports`        | Report page                | Generate, inspect, and download persisted reports.    |
| `/admin/payouts`        | `admin/Payouts`        | Settlement management page | Review pending seller earnings and mark payouts paid. |
| `/admin/notifications`  | `admin/Notifications`  | List/action page           | Review platform notifications.                        |

### Agent

| Route                    | Component              | Format              | Purpose                                          |
| ------------------------ | ---------------------- | ------------------- | ------------------------------------------------ |
| `/agent/dashboard`       | `agent/Dashboard`      | Dashboard/list page | Show assigned deliveries and status filters.     |
| `/agent/update-location` | `agent/UpdateLocation` | Form workflow       | Set location and delivery status for a delivery. |

## Payment and settlement flow

1. Buyer completes the checkout form.
2. The server creates the order and records a pending payment addressed only to `0785898551`.
3. The server creates a pending seller payout for the seller attached to the order.
4. Admin reviews `/admin/payouts` and marks the seller payout as paid after confirming the buyer payment.

The payment destination must remain server-owned. A buyer request must never be able to replace the admin number.
