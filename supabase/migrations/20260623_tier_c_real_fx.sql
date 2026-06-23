-- Tier C: PKR anchors with USD/INR from real FX (≈278 PKR/USD). Re-sync Stripe via setup-stripe-products.mjs.

update public.pricing_config set amount_cents = 1331
  where region_tier = 'C' and currency = 'usd' and billing_period = 'monthly'
    and product_key in ('student', 'scholar');

update public.pricing_config set amount_cents = 10446
  where region_tier = 'C' and currency = 'usd' and billing_period = 'yearly'
    and product_key in ('student', 'scholar');

update public.pricing_config set amount_cents = 2518
  where region_tier = 'C' and currency = 'usd' and billing_period = 'monthly'
    and product_key = 'mastery';

update public.pricing_config set amount_cents = 19752
  where region_tier = 'C' and currency = 'usd' and billing_period = 'yearly'
    and product_key = 'mastery';

-- INR at ~95 INR/USD from $13.31 anchor (stripe script refreshes with live FX)
update public.pricing_config set amount_cents = 126400
  where region_tier = 'C' and currency = 'inr' and billing_period = 'monthly'
    and product_key in ('student', 'scholar');

update public.pricing_config set amount_cents = 992400
  where region_tier = 'C' and currency = 'inr' and billing_period = 'yearly'
    and product_key in ('student', 'scholar');

update public.pricing_config set amount_cents = 239200
  where region_tier = 'C' and currency = 'inr' and billing_period = 'monthly'
    and product_key = 'mastery';

update public.pricing_config set amount_cents = 1876400
  where region_tier = 'C' and currency = 'inr' and billing_period = 'yearly'
    and product_key = 'mastery';
