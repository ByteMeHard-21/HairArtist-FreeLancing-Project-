import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { defaultMenuServices, mergeMenuServices, menuCategoriesFor, type MenuServiceOverride } from "../src/lib/menu-services";
import { menuServiceInput } from "../src/lib/menu-service-input";

test("Overrides update featured prices, retain hidden state, add categories, and leave defaults untouched", () => {
  const override: MenuServiceOverride = { id: "classic-cut", name: "Classic Haircut", category: "Haircut", audiences: ["men"], price: 225, status: "confirmed", is_custom: false, is_hidden: true, sort_order: 0 };
  const merged = mergeMenuServices([override, { ...override, id: "custom-test", name: "Custom Cut", category: "New category", is_custom: true, is_hidden: false, sort_order: 999 }]);
  assert.equal(merged.find(item => item.id === "classic-cut")?.price, 225);
  assert.equal(merged.find(item => item.id === "classic-cut")?.isHidden, true);
  assert.equal(defaultMenuServices.find(item => item.id === "classic-cut")?.price, 100);
  assert.equal(merged.length, defaultMenuServices.length + 1);
  assert.ok(menuCategoriesFor(merged).includes("New category"));
  assert.equal(merged.find(item => item.id === "groom-package")?.price, 2499);
});

test("Price and service inputs reject coercion, invalid values, and forged persistence fields", () => {
  const input = { name: "Test cut", category: "Haircut", audience: "men", price: 200, visible: true };
  assert.ok(menuServiceInput.safeParse(input).success);
  for (const price of [null, "200", -1, 1.5, 200001, Number.NaN]) assert.equal(menuServiceInput.safeParse({ ...input, price }).success, false);
  for (const change of [{ name: " " }, { category: " " }, { audience: "children" }, { is_custom: false }, { id: "classic-cut" }]) assert.equal(menuServiceInput.safeParse({ ...input, ...change }).success, false);
});

test("Menu migration enforces active-admin RLS, valid prices and a single Groom package", async () => {
  const db = new PGlite();
  const admin = "11111111-1111-4111-8111-111111111111", outsider = "22222222-2222-4222-8222-222222222222";
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
      create function auth.jwt() returns jsonb language sql stable as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;
      grant usage on schema auth to authenticated,anon;grant execute on all functions in schema auth to authenticated,anon;`);
    for (const file of ["202609170001_booking.sql", "202609170002_notification_recipients.sql", "202609190001_admin_security.sql", "202609200001_admin_password_access.sql", "202609270001_menu_service_overrides.sql"]) {
      await db.exec(readFileSync(new URL("../supabase/migrations/" + file, import.meta.url), "utf8"));
    }
    await db.query("insert into auth.users values($1),($2)", [admin, outsider]);
    await db.query("insert into admin_users(user_id) values($1)", [admin]);
    const assume = async (id: string) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub: id, aal: "aal1" })]);
      await db.exec("set role authenticated");
    };
    const insert = "insert into menu_service_overrides(id,name,category,audiences,price) values('classic-cut','Classic Haircut','Haircut',array['men'],200)";
    await db.exec("set role anon");
    await assert.rejects(db.exec(insert), /permission denied/);
    await assert.rejects(db.query("select * from menu_service_overrides"), /permission denied/);
    await assume(outsider);
    await assert.rejects(db.exec(insert), /row-level security/);
    await assume(admin);
    await db.exec(insert);
    await db.exec("update menu_service_overrides set price=250,is_hidden=true where id='classic-cut'");
    assert.deepEqual((await db.query("select price,is_hidden from menu_service_overrides")).rows, [{ price: 250, is_hidden: true }]);
    await assert.rejects(db.exec("update menu_service_overrides set price=-1"), /check constraint/);
    await assert.rejects(db.exec("update menu_service_overrides set audiences=array[null]::text[]"), /check constraint/);
    await assert.rejects(db.exec("update menu_service_overrides set audiences=array['groom']"), /check constraint/);
    await assert.rejects(db.exec("delete from menu_service_overrides"), /permission denied/);
    await assume(outsider);
    assert.equal((await db.query("select * from menu_service_overrides")).rows.length, 0);
    await db.exec("update menu_service_overrides set price=1");
    await db.exec("reset role;update admin_users set is_active=false");
    await assume(admin);
    await assert.rejects(db.exec(insert.replace("classic-cut", "custom-test")), /row-level security/);
    await db.exec("update menu_service_overrides set price=1");
    await db.exec("reset role;set role service_role");
    assert.equal((await db.query<{price:number}>("select price from menu_service_overrides")).rows[0].price, 250);
  } finally { await db.close(); }
});
