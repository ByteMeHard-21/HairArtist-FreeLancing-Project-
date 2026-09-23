import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {PGlite} from "@electric-sql/pglite";
const admin="11111111-1111-4111-8111-111111111111", outsider="22222222-2222-4222-8222-222222222222";
test("Admin RLS requires active membership; password-only sessions work; cancellation is constrained; expiry is system-only",async()=>{
  const db=new PGlite();
  try{
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;`);
    await db.exec("create function auth.jwt() returns jsonb language sql stable as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;grant usage on schema auth to authenticated,anon;grant execute on all functions in schema auth to authenticated,anon;");
    for(const name of ["202609170001_booking.sql","202609170002_notification_recipients.sql","202609190001_admin_security.sql","202609200001_admin_password_access.sql"])
      await db.exec(readFileSync(new URL("../supabase/migrations/"+name,import.meta.url),"utf8"));
    await db.query("insert into auth.users(id) values($1),($2)",[admin,outsider]);
    await db.query("insert into admin_users(user_id) values($1)",[admin]);
    const insert=await db.query<{id:string}>("insert into bookings(appointment_date,slot_start,slot_end,customer_name,gender,mobile_number,service) values(current_date+2,'10:00','11:00','Private Test','men','+919999999999','Haircut') returning id");
    const id=insert.rows[0].id;
    const assume=async(user:string,aal:string)=>{
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:user,aal})]);
      await db.exec("set role authenticated");
    };
    for(const [user,aal] of [[outsider,"aal1"],[outsider,"aal2"]]){
      await assume(user,aal);
      assert.equal((await db.query("select * from bookings")).rows.length,0);
      await assert.rejects(db.query("select cancel_studio_booking($1)",[id]),/FORBIDDEN/);
      await assert.rejects(db.query("insert into availability_exceptions(date,reason) values(current_date+3,'Hidden')"),/row-level security/);
    }
    await assume(admin,"aal1");
    assert.equal((await db.query("select * from bookings")).rows.length,1);
    await assert.rejects(db.query("update bookings set customer_name='Tampered'"),/permission denied/);
    await assert.rejects(db.query("delete from bookings"),/permission denied/);
    await assert.rejects(db.query("update admin_users set is_active=true"),/permission denied/);
    await assert.rejects(db.query("select * from booking_challenges"),/permission denied/);
    await db.query("insert into availability_exceptions(date,reason) values(current_date+3,'Personal leave')");
    await db.query("insert into public_announcements(message,active,start_date,end_date) values('Closed tomorrow',true,current_date,current_date+1)");
    assert.equal((await db.query("select * from public_announcements")).rows.length,1);
    await db.query("select cancel_studio_booking($1)",[id]);
    assert.equal((await db.query<{status:string}>("select status from bookings")).rows[0].status,"CANCELLED");
    assert.equal((await db.query<{result:null}>("select cancel_studio_booking($1) result",[id])).rows[0].result,null);
    await assert.rejects(db.query("select expire_studio_bookings(now())"),/permission denied/);
    await db.exec("reset role");
    await db.query("update admin_users set is_active=false where user_id=$1",[admin]);
    await assume(admin,"aal1");
    assert.equal((await db.query("select * from bookings")).rows.length,0,"Deactivation takes effect without JWT refresh");
    await db.exec("reset role;set role anon");
    await assert.rejects(db.query("select * from bookings"),/permission denied/);
    await assert.rejects(db.query("select * from admin_users"),/permission denied/);
    await db.exec("reset role;alter table bookings disable trigger booking_capacity");
    await db.query("insert into bookings(appointment_date,slot_start,slot_end,customer_name,gender,mobile_number,service) values(current_date-1,'10:00','11:00','Historical Test','men','+919999999999','Haircut')");
    await db.exec("alter table bookings enable trigger booking_capacity;set role service_role");
    await assert.rejects(db.query("select expire_studio_bookings(now()+interval '1 day')"),/INVALID_CUTOFF/);
    assert.equal((await db.query<{n:number}>("select expire_studio_bookings(now()) n")).rows[0].n,1);
    assert.equal((await db.query<{n:number}>("select expire_studio_bookings(now()) n")).rows[0].n,0);
    assert.equal((await db.query<{n:number}>("select count(*)::int n from bookings where status='CANCELLED'")).rows[0].n,1);
  }finally{await db.close();}
});
