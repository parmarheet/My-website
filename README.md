# Luma Atelier

Premium e-commerce starter built as a fast static-first storefront with a lightweight Python preview server.

## Includes

- Modern homepage with hero animation, featured products, and category browsing
- Product catalog with filtering, search, and responsive product cards
- Product detail page with image gallery, zoom-style hover, variants, stock, add-to-cart, and buy now
- Checkout flow with real-time summary, Stripe/Razorpay selector, and confirmation page
- Customer account area with email and mock Google sign-in, profile panel, and order history
- Admin dashboard for product CRUD-style management, orders, users, and analytics snapshot
- Seeded SQL schema for a scalable backend migration path

## Run locally

```bash
python3 server.py
```

Then open `http://127.0.0.1:8000`.

## Notes

- App state is persisted in `localStorage` so the storefront works without external dependencies.
- Payment and auth integrations are UI-ready placeholders; connect them to Stripe, Razorpay, and your preferred auth backend when moving to production.
- The included [data/schema.sql](/home/parmar-heet/Downloads/Codex/data/schema.sql) gives you a practical normalized schema for scaling beyond the prototype.
