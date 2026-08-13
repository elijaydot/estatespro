import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";
import { buildWebhookSignature, computeWebhookBackoffMs, shouldRetryWebhookDelivery } from "../_shared/webhook-delivery.ts";
import { buildWebhookEventEnvelope } from "../_shared/webhook-events.ts";

type WebhookEvent = { id:string; company_id:string; event_id:string; event_type:string; correlation_id:string|null; payload:Record<string,unknown>; attempt_count:number };
type WebhookEndpoint = { id:string; target_url:string; secret_ref:string; max_attempts:number; timeout_ms:number };

serve(async (req) => {
  const workerSecret=Deno.env.get("WEBHOOK_WORKER_SECRET")??"";
  if (req.method!=="POST") return new Response("Method not allowed",{status:405});
  if (!workerSecret || req.headers.get("x-webhook-worker-secret")!==workerSecret) return new Response("Unauthorized",{status:401});
  const supabase=createClient(Deno.env.get("SUPABASE_URL")??"",Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"");
  const {data:claimed,error:claimError}=await supabase.rpc("claim_fishgate_webhook_events",{p_limit:25});
  if (claimError) return Response.json({error:"claim_failed"},{status:500});
  let delivered=0; let deferred=0;
  for (const event of (claimed??[]) as WebhookEvent[]) {
    const {data:endpoints}=await supabase.from("webhook_endpoints").select("id,target_url,secret_ref,max_attempts,timeout_ms").eq("company_id",event.company_id).eq("event_type",event.event_type).eq("is_active",true);
    let retryAt:Date|null=null; let lastError:string|null=null;
    for (const endpoint of (endpoints??[]) as WebhookEndpoint[]) {
      const envelope=buildWebhookEventEnvelope({eventType:event.event_type,eventId:event.event_id,companyId:event.company_id,correlationId:event.correlation_id??undefined,payload:event.payload});
      const body=JSON.stringify(envelope); const timestamp=`${Math.floor(Date.now()/1000)}`; const secret=Deno.env.get(endpoint.secret_ref)??""; const started=Date.now();
      let signature=""; let statusCode:number|null=null; let success=false; let errorMessage:string|undefined;
      if (!secret) errorMessage="Missing webhook secret";
      else try {
        signature=await buildWebhookSignature({secret,payload:body,timestamp});
        const response=await fetch(endpoint.target_url,{method:"POST",headers:{"Content-Type":"application/json","x-webhook-signature":signature,"x-webhook-timestamp":timestamp,"x-webhook-event":event.event_type,"x-webhook-version":envelope.version},body,signal:AbortSignal.timeout(endpoint.timeout_ms)});
        statusCode=response.status; success=response.ok; if (!success) errorMessage=(await response.text().catch(()=>""))||`HTTP ${response.status}`;
      } catch (error) { errorMessage=error instanceof Error?error.message:"Webhook delivery failed"; }
      const shouldRetry=shouldRetryWebhookDelivery(statusCode,event.attempt_count,endpoint.max_attempts);
      const endpointRetryAt=shouldRetry?new Date(Date.now()+computeWebhookBackoffMs(event.attempt_count)):null;
      await supabase.from("webhook_delivery_attempts").insert({endpoint_id:endpoint.id,event_type:event.event_type,event_id:event.event_id,correlation_id:event.correlation_id,payload:envelope,signature:signature||null,attempt:event.attempt_count,status_code:statusCode,success,error_message:errorMessage??null,duration_ms:Date.now()-started,next_retry_at:endpointRetryAt?.toISOString()??null,delivered_at:success?new Date().toISOString():null});
      if (!success && !shouldRetry) await supabase.from("webhook_dead_letters").upsert({endpoint_id:endpoint.id,event_type:event.event_type,event_id:event.event_id,correlation_id:event.correlation_id,payload:envelope,final_status_code:statusCode,failure_reason:errorMessage??"Webhook delivery failed",total_attempts:event.attempt_count},{onConflict:"endpoint_id,event_id"});
      if (endpointRetryAt && (!retryAt || endpointRetryAt<retryAt)) retryAt=endpointRetryAt;
      if (!success) lastError=errorMessage??"Webhook delivery failed";
    }
    if (retryAt) { deferred+=1; await supabase.from("webhook_events").update({status:"pending",next_attempt_at:retryAt.toISOString(),last_error:lastError,claimed_at:null}).eq("id",event.id).eq("company_id",event.company_id); }
    else { delivered+=1; await supabase.from("webhook_events").update({status:"delivered",processed_at:new Date().toISOString(),last_error:lastError}).eq("id",event.id).eq("company_id",event.company_id); }
  }
  return Response.json({claimed:(claimed??[]).length,delivered,deferred});
});