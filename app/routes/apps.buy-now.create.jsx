import { redirect } from "react-router";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const referer = request.headers.get("referer") || "/";
  const backTo = (message) => {
    const url = new URL(referer);
    url.searchParams.set("buy_now_error", message);
    return redirect(url.toString());
  };

  const { storefront } = await authenticate.public.appProxy(request);

  if (!storefront) {
    return backTo("App is not installed on this store");
  }

  const formData = await request.formData();

  const variantId = parseInt(formData.get("id"));
  const quantity = parseInt(formData.get("quantity")) || 1;
  const sellingPlanRaw = formData.get("selling_plan");
  const sellingPlanId = sellingPlanRaw ? parseInt(sellingPlanRaw) : null;

  if (!variantId || !Number.isInteger(variantId)) {
    return backTo("Invalid variant");
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    return backTo("Invalid quantity");
  }

  const merchandiseId = `gid://shopify/ProductVariant/${variantId}`;

  const lineInput = {
    merchandiseId,
    quantity,
    ...(sellingPlanId && !isNaN(sellingPlanId)
      ? { sellingPlanId: `gid://shopify/SellingPlan/${sellingPlanId}` }
      : {}),
  };

  const query = `
    mutation CartCreate($lines: [CartLineInput!]!) {
      cartCreate(input: { lines: $lines }) {
        cart {
          id
          checkoutUrl
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const response = await storefront.graphql(query, {
      variables: { lines: [lineInput] },
    });
    const data = await response.json();

    if (data.data.cartCreate.userErrors.length) {
      return backTo(data.data.cartCreate.userErrors[0].message);
    }

    return redirect(data.data.cartCreate.cart.checkoutUrl);
  } catch (err) {
    console.error("Buy Now cartCreate error:", err);
    return backTo("Something went wrong. Please try again.");
  }
};
