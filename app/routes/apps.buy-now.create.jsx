import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { storefront } = await authenticate.public.appProxy(request);

  if (!storefront) {
    return Response.json(
      { error: "App is not installed on this store" },
      { status: 401 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { variantId, quantity, sellingPlanId } = body;

  if (!variantId || !Number.isInteger(variantId)) {
    return Response.json({ error: "Invalid variant ID" }, { status: 400 });
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return Response.json({ error: "Invalid quantity" }, { status: 400 });
  }

  const merchandiseId = `gid://shopify/ProductVariant/${variantId}`;

  const lineInput = {
    merchandiseId,
    quantity,
    ...(sellingPlanId ? { sellingPlanId: `gid://shopify/SellingPlan/${sellingPlanId}` } : {}),
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
      return Response.json(
        { error: data.data.cartCreate.userErrors[0].message },
        { status: 400 }
      );
    }

    return Response.json({ checkoutUrl: data.data.cartCreate.cart.checkoutUrl });
  } catch (err) {
    console.error("Buy Now cartCreate error:", err);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
};
