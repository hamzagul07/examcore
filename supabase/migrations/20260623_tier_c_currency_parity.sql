-- Tier C subscription prices: PKR anchor with USD/INR at 100 PKR = $1 peg.
-- PKR rows unchanged. Re-run scripts/setup-stripe-products.mjs to create matching Stripe prices.

update public.pricing_config set amount_cents = 3700
  where region_tier = 'C' and currency = 'usd' and billing_period = 'monthly'
    and product_key in ('student', 'scholar');

update public.pricing_config set amount_cents = 29030
  where region_tier = 'C' and currency = 'usd' and billing_period = 'yearly'
    and product_key in ('student', 'scholar');

update public.pricing_config set amount_cents = 6999
  where region_tier = 'C' and currency = 'usd' and billing_period = 'monthly'
    and product_key = 'mastery';

update public.pricing_config set amount_cents = 54910
  where region_tier = 'C' and currency = 'usd' and billing_period = 'yearly'
    and product_key = 'mastery';

update public.pricing_config set amount_cents = 307100
  where region_tier = 'C' and currency = 'inr' and billing_period = 'monthly'
    and product_key in ('student', 'scholar');

update public.pricing_config set amount_cents = 2409500
  where region_tier = 'C' and currency = 'inr' and billing_period = 'yearly'
    and product_key in ('student', 'scholar');

update public.pricing_config set amount_cents = 580900
  where region_tier = 'C' and currency = 'inr' and billing_period = 'monthly'
    and product_key = 'mastery';

update public.pricing_config set amount_cents = 4557500
  where region_tier = 'C' and currency = 'inr' and billing_period = 'yearly'
    and product_key = 'mastery';
