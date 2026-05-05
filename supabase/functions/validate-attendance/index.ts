import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*' ,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { operation_id, lat, lng, user_id, image_url, captured_at, note } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '' ,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: op, error: opError } = await supabase
      .from('operations')
      .select('*')
      .eq('id', operation_id)
      .single()

    if (opError || !op) {
      return new Response(JSON.stringify({ error: 'Operation not found' }) , { status: 400 , headers: corsHeaders })
    }

    const distance = getDistanceMeters(lat, lng, op.lat, op.lng)
    if (distance > op.radius_meters) {
      return new Response(JSON.stringify({ error: `Too far . you are ${Math.round(distance)}m away , limit is ${op.radius_meters}m` }) , { status: 400 , headers: corsHeaders })
    }

    const now = new Date(captured_at)
    const timeStr = now.toTimeString().slice(0, 5)
    if (timeStr < op.shift_start || timeStr > op.shift_end) {
      return new Response(JSON.stringify({ error: `Outside login window . allowed ${op.shift_start} to ${op.shift_end}` }) , { status: 400 , headers: corsHeaders })
    }

    const { error: insertError } = await supabase.from('attendance_log').insert({
      user_id , image_url , lat , lng , captured_at , note , operation_id
    })

    if (insertError) throw insertError

    return new Response(JSON.stringify({ success: true }) , { headers: corsHeaders })

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }) , { status: 500 , headers: corsHeaders })
  }
})