-- Fixed regional list prices for student/scholar (GBP £13, EUR €13, AUD A$20, INR ₹2300).
-- PKR and USD unchanged. Re-run scripts/setup-stripe-products.mjs for new Stripe price IDs.

-- Tier A: GBP
update public.pricing_config set amount_cents = 1300
  where region_tier = 'A' and currency = 'gbp' and billing_period = 'monthly'
    and product_key in ('student', 'scholar');

update public.pricing_config set amount_cents = 10200
  where region_tier = 'A' and currency = 'gbp' and billing_period = 'yearly'
    and product_key in ('student', 'scholar');

-- Tier A: EUR
update public.pricing_config set amount_cents = 1300
  where region_tier = 'A' and currency = 'eur' and billing_period = 'monthly'
    and product_key in ('student', 'scholar');

update public.pricing_config set amount_cents = 10200
  where region_tier = 'A' and currency = 'eur' and billing_period = 'yearly'
    and product_key in ('student', 'scholar');

-- Tier A: AUD
update public.pricing_config set amount_cents = 2000
  where region_tier = 'A' and currency = 'aud' and billing_period = 'monthly'
    and product_key in ('student', 'scholar');

update public.pricing_config set amount_cents = 15700
  where region_tier = 'A' and currency = 'aud' and billing_period = 'yearly'
    and product_key in ('student', 'scholar');

-- Tier C: INR
update public.pricing_config set amount_cents = 230000
  where region_tier = 'C' and currency = 'inr' and billing_period = 'monthly'
    and product_key in ('student', 'scholar');

update public.pricing_config set amount_cents = 1804700
  where region_tier = 'C' and currency = 'inr' and billing_period = 'yearly'
    and product_key in ('student', 'scholar');
