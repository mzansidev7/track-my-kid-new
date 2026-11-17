// import { expect, test, type Page } from "@playwright/test";

// const apiUrl = "http://127.0.0.1:4000";
// const checkoutUrl = "http://127.0.0.1:8081/test-paystack/checkout";

// const paymentSummary = (isPaid: boolean) => ({
//   client_id: "test-client-id",
//   currency: "zar",
//   total_amount_cents: isPaid ? 0 : 10_000,
//   children_count: 1,
//   route_linked_children_count: 1,
//   client_children_count: 1,
//   unpaid_child_names: isPaid ? [] : ["Ari"],
//   pending_child_names: [],
//   payment_due_at: "5th of the month",
//   service_fee_trial: null,
//   payment_groups: isPaid
//     ? []
//     : [
//         {
//           group_id: "test-route-group",
//           owner_id: "test-owner-id",
//           owner_name: "Test Transport",
//           vehicle_name: "Test vehicle",
//           children_count: 1,
//           child_names: ["Ari"],
//           total_amount_cents: 10_000,
//           service_fee_cents: 0,
//           service_fee_waived: true,
//           total_due_cents: 10_000,
//           route_pricing: [
//             {
//               route_id: "test-route",
//               route_name: "Test route",
//               child_count: 1,
//               per_child_amount_cents: 10_000,
//             },
//           ],
//         },
//       ],
// });

// const paymentHistory = (isPaid: boolean) =>
//   isPaid
//     ? [
//         {
//           id: "test-payment-id",
//           status: "paid",
//           payment_method: "card",
//           amount_cents: 10_000,
//           currency: "zar",
//           created_at: "2026-01-01T12:00:00.000Z",
//           children_count: 1,
//           owners: { company_name: "Test Transport" },
//           vehicles: { name: "Test vehicle" },
//         },
//       ]
//     : [];

// const mockLoginAndPaymentApi = async (
//   page: Page,
//   checkoutFails = false,
// ) => {
//   let isPaid = false;

//   await page.context().route("**/auth/v1/user", async (route) => {
//     await route.fulfill({
//       json: {
//         id: "test-client-id",
//         aud: "authenticated",
//         role: "authenticated",
//         email: "parent@example.test",
//       },
//     });
//   });

//   await page.context().route("**/test-paystack/settle", async (route) => {
//     isPaid = true;
//     await route.fulfill({ json: { verified: true } });
//   });

//   await page.context().route("**/test-paystack/checkout**", async (route) => {
//     await route.fulfill({
//       contentType: "text/html",
//       body: `<!doctype html>
//         <html>
//           <head><title>Test Paystack Checkout</title></head>
//           <body>
//             <h1>Test Paystack Checkout</h1>
//             <button onclick="completePayment()">Complete test payment</button>
//             <script>
//               async function completePayment() {
//                 await fetch('/test-paystack/settle', { method: 'POST' });
//                 window.location.assign('/pages/payments?reference=test-reference');
//               }
//             </script>
//           </body>
//         </html>`,
//     });
//   });

//   await page.route(`${apiUrl}/**`, async (route) => {
//     const request = route.request();
//     const url = new URL(request.url());

//     if (url.pathname === "/health") {
//       await route.fulfill({ json: { status: "ok" } });
//       return;
//     }

//     if (url.pathname === "/login" && request.method() === "POST") {
//       const expiresAt = Math.floor(Date.now() / 1000) + 3600;
//       const accessToken = [
//         "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
//         Buffer.from(
//           JSON.stringify({ sub: "test-client-id", exp: expiresAt }),
//         ).toString("base64url"),
//         "test-signature",
//       ].join(".");

//       await route.fulfill({
//         json: {
//           token: "test-backend-token",
//           user: {
//             id: "test-client-id",
//             role: "client",
//             email: "parent@example.test",
//             name: "Test Parent",
//             is_verified: true,
//           },
//           supabaseSession: {
//             access_token: accessToken,
//             refresh_token: "test-refresh-token",
//           },
//         },
//       });
//       return;
//     }

//     if (
//       url.pathname === "/client/payments/summary" &&
//       request.method() === "GET"
//     ) {
//       await route.fulfill({ json: paymentSummary(isPaid) });
//       return;
//     }

//     if (
//       url.pathname === "/client/payments/history" &&
//       request.method() === "GET"
//     ) {
//       await route.fulfill({ json: paymentHistory(isPaid) });
//       return;
//     }

//     if (
//       url.pathname === "/client/payments/checkout-session" &&
//       request.method() === "POST"
//     ) {
//       if (checkoutFails) {
//         await route.fulfill({
//           status: 503,
//           json: { error: "Test checkout unavailable" },
//         });
//         return;
//       }

//       await route.fulfill({ json: { checkout_url: checkoutUrl } });
//       return;
//     }

//     if (
//       url.pathname === "/client/profile" ||
//       url.pathname === "/clients/profile" ||
//       url.pathname === "/client" ||
//       url.pathname === "/clients/me" ||
//       url.pathname === "/me"
//     ) {
//       await route.fulfill({
//         json: {
//           id: "test-client-id",
//           first_name: "Test",
//           last_name: "Parent",
//           phone: "+27123456789",
//           relationship: "parent",
//           home_address: "1 Test Street",
//           home_latitude: 0,
//           home_longitude: 0,
//         },
//       });
//       return;
//     }

//     if (url.pathname === "/client/attendance") {
//       await route.fulfill({
//         json: { records: [], absenceReports: [], children: [], history: [] },
//       });
//       return;
//     }

//     await route.fulfill({ json: [] });
//   });

//   return {
//     isPaid: () => isPaid,
//   };
// };

// const loginAndOpenPayments = async (page: Page) => {
//   await page.goto("/");
//   await page.getByText("Login", { exact: true }).first().click();
//   await page.getByRole("textbox", { name: "Email address" }).fill(
//     "parent@example.test",
//   );
//   await page.getByRole("textbox", { name: "Password" }).fill("test-password");
//   await page.getByRole("button", { name: "Login", exact: true }).click();

//   await page.getByText("Profile", { exact: true }).waitFor();
//   await page.getByText("Profile", { exact: true }).click();
//   await page.getByText("Payments & Invoices", { exact: true }).click();
//   await page.getByText("Payments", { exact: true }).waitFor();
//   await expect(page.getByText("Payment required", { exact: true })).toBeVisible();
// };

// test("parent logs in, completes checkout, and sees the verified payment", async ({
//   page,
// }) => {
//   const backend = await mockLoginAndPaymentApi(page);
//   await loginAndOpenPayments(page);

//   await Promise.all([
//     page.waitForURL("**/test-paystack/checkout"),
//     page.getByText(/^Pay /).click(),
//   ]);
//   await page.getByRole("button", { name: "Complete test payment" }).click();

//   await page.waitForURL("**/pages/payments?reference=test-reference");
//   await expect(page.getByText("Payment successful", { exact: true })).toBeVisible();
//   await expect(page.getByText("All children paid", { exact: true })).toBeVisible();
//   expect(backend.isPaid()).toBe(true);
// });

// test("abandoning checkout does not mark the payment as paid", async ({
//   page,
// }) => {
//   const backend = await mockLoginAndPaymentApi(page);
//   await loginAndOpenPayments(page);

//   await Promise.all([
//     page.waitForURL("**/test-paystack/checkout"),
//     page.getByText(/^Pay /).click(),
//   ]);
//   await page.goBack();

//   await expect(page.getByText("Payment required", { exact: true })).toBeVisible();
//   await expect(page.getByText("Payment successful", { exact: true })).toHaveCount(
//     0,
//   );
//   expect(backend.isPaid()).toBe(false);
// });

// test("checkout initialization failure is shown and does not mark payment as paid", async ({
//   page,
// }) => {
//   const backend = await mockLoginAndPaymentApi(page, true);
//   await loginAndOpenPayments(page);

//   await page.getByText(/^Pay /).click();
//   await expect(page.getByText("Test checkout unavailable")).toBeVisible();
//   await page.getByText("Try again", { exact: true }).click();
//   await expect(page.getByText("Payment required", { exact: true })).toBeVisible();
//   await expect(page.getByText("Payment successful", { exact: true })).toHaveCount(
//     0,
//   );
//   expect(backend.isPaid()).toBe(false);
// });
