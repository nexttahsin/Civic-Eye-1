import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createAuthUser(email, password) {
  const { data, error } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error) {
    if (error.message.includes('already') || error.message.includes('registered')) {
      const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const existing = list?.users?.find(u => u.email === email);
      if (existing) { console.log(`  ⚠ ${email} already exists → ${existing.id}`); return existing.id; }
    }
    throw new Error(`Auth error for ${email}: ${error.message}`);
  }
  console.log(`  ✓ Created ${email} → ${data.user.id}`);
  return data.user.id;
}

async function run() {
  console.log('\n👤 Creating auth users...\n');
  const authorityId = await createAuthUser('dncc_admin@authority.nagarik.seba', 'Demo@2025');
  const citizenId   = await createAuthUser('demo_citizen@nagarik.seba', 'Demo@2025');

  console.log('\n👤 Inserting citizen profile...\n');
  const { error: cErr } = await supabase.from('users').upsert({
    id: citizenId,
    full_name: 'রাহেলা বেগম',
    phone: '01712345678',
    reputation_score: 78,
    total_reports: 12,
    verified_reports: 9,
  }, { onConflict: 'id' });
  if (cErr) throw new Error('Citizen profile: ' + cErr.message);
  console.log('  ✓ Citizen profile inserted');

  console.log('\n🏢 Inserting authority user...\n');
  const { data: dept, error: dErr } = await supabase.from('departments').select('id').eq('slug', 'dncc').single();
  if (dErr || !dept) throw new Error('Cannot find DNCC department. Did you run schema.sql first?');

  const { error: aErr } = await supabase.from('authority_users').upsert({
    auth_user_id: authorityId,
    department_id: dept.id,
    username: 'dncc_admin',
    full_name: 'DNCC Admin Officer',
    role: 'admin',
    is_active: true,
  }, { onConflict: 'username' });
  if (aErr) throw new Error('Authority user: ' + aErr.message);
  console.log('  ✓ authority_users row created');

  console.log('\n📊 Seeding demo reports...\n');
  const cats     = ['pothole','garbage','waterlogging','street_light','electrical_failure','pothole','garbage','waterlogging','pothole','street_light','waterlogging','pothole'];
  const statuses = ['submitted','under_review','in_progress','resolved','submitted','submitted','resolved','submitted','under_review','in_progress','submitted','rejected'];
  const urgency  = [9.2, 7.5, 8.8, 6.1, 8.0, 9.5, 5.0, 8.3, 7.8, 6.9, 9.1, 4.5];
  const wards    = ['Ward 6','Ward 1','Ward 12','Ward 9','Ward 7','Ward 3','Ward 8','Ward 11','Ward 4','Ward 5','Ward 2','Ward 10'];
  const addrs    = ['মিরপুর ১০, ঢাকা','উত্তরা সেক্টর ৪','বনশ্রী ব্লক এ','কল্যাণপুর, ঢাকা','পল্লবী, ঢাকা','আগারগাঁও, ঢাকা','তেজগাঁও, ঢাকা','মোহাম্মদপুর, ঢাকা','গুলশান ১, ঢাকা','বাড্ডা, ঢাকা','ভাটারা, ঢাকা','খিলক্ষেত, ঢাকা'];
  const descs    = ['রাস্তায় বড় গর্ত, গাড়ি চলতে পারছে না।','ময়লা সংগ্রহ হচ্ছে না ৫ দিন ধরে।','বৃষ্টির পরে পানি জমে আছে।','স্ট্রিট লাইট নষ্ট।','বিদ্যুৎ বিভ্রাট চলছে ২ দিন ধরে।','সড়কে বিপজ্জনক গর্ত।','ময়লার স্তূপ জমে আছে।','ড্রেন বন্ধ হয়ে পানি উপচে পড়ছে।','রাস্তার গর্তে দুর্ঘটনা হয়েছে।','বেশ কয়েকটি লাইট নষ্ট।','ড্রেনেজ বন্ধ।','রাস্তার ক্ষতি মেরামত দরকার।'];

  for (let i = 0; i < 12; i++) {
    const daysAgo   = Math.floor(i * 2.5);
    const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString();
    const updatedAt = new Date(Date.now() - Math.max(0, daysAgo - 1) * 86400000).toISOString();
    const num       = `DHK-2025${String(i + 1).padStart(4, '0')}`;
    const aiVerified = i % 3 !== 2;

    const { data: report, error: rErr } = await supabase.from('reports').upsert({
      report_number: num,
      user_id: citizenId,
      department_id: dept.id,
      category: cats[i],
      status: statuses[i],
      urgency_score: urgency[i],
      address: addrs[i],
      ward_name: wards[i],
      description: descs[i],
      ai_verified: aiVerified,
      is_flagged_fake: false,
      image_count: 1,
      created_at: createdAt,
      updated_at: updatedAt,
    }, { onConflict: 'report_number' }).select().single();

    if (rErr) { console.warn(`  ⚠ ${num}: ${rErr.message}`); continue; }

    await supabase.from('report_images').upsert({ report_id: report.id, public_url: `https://picsum.photos/seed/${num}/800/600`, upload_order: 0 });

    if (aiVerified) {
      await supabase.from('ai_analysis').upsert({ report_id: report.id, is_aggregate: true, summary: `AI বিশ্লেষণ: এই ${cats[i]} সমস্যাটি ${urgency[i] > 8 ? 'অত্যন্ত জরুরি' : 'মধ্যম গুরুত্বপূর্ণ'}। ছবি বিশ্লেষণে সত্যতা নিশ্চিত।`, severity: urgency[i] > 8 ? 'high' : urgency[i] > 6 ? 'medium' : 'low', confidence: parseFloat((0.82 + (i % 5) * 0.03).toFixed(2)), tags: [cats[i], 'dhaka', 'urban'] });
    }

    await supabase.from('activity_logs').insert({ report_id: report.id, actor_type: 'system', actor_id: 'system', action: 'report_submitted', details: { category: cats[i], urgency: urgency[i] }, created_at: createdAt });

    if (statuses[i] !== 'submitted') {
      await supabase.from('activity_logs').insert({ report_id: report.id, actor_type: 'authority', actor_id: 'dncc_admin', action: 'status_updated', details: { from: 'submitted', to: statuses[i], officer: 'DNCC Admin Officer', note: 'পরিদর্শন সম্পন্ন।' }, created_at: updatedAt });
    }

    console.log(`  ✓ ${num} — ${cats[i]} (${statuses[i]}, urgency ${urgency[i]})`);
  }

  console.log('\n🎉 Seed complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Username : dncc_admin');
  console.log('  Password : Demo@2025');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });
