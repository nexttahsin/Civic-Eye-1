import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Extract project ref from URL
const projectRef = supabaseUrl.replace('https://', '').split('.')[0];

async function execSQL(label, sql) {
  // Use Supabase Management API to execute SQL
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql.trim() })
  });

  if (!res.ok) {
    const text = await res.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = { message: text }; }
    const msg = parsed?.message || text;
    if (msg.includes('already exists') || msg.includes('duplicate')) {
      console.log(`  ⚠ ${label} (already exists)`);
      return;
    }
    throw new Error(`${label}: ${msg}`);
  }
  console.log(`  ✓ ${label}`);
}

async function setupSchema() {
  console.log('\n📋 Creating database schema...\n');

  await execSQL('extensions', `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

  await execSQL('departments table', `
    CREATE TABLE IF NOT EXISTS departments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      name_bn TEXT NOT NULL,
      jurisdiction_area TEXT NOT NULL DEFAULT '',
      issue_categories TEXT[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await execSQL('seed departments', `
    INSERT INTO departments (slug, name, name_bn, jurisdiction_area, issue_categories) VALUES
      ('dncc', 'Dhaka North City Corporation', 'ঢাকা উত্তর সিটি কর্পোরেশন', 'Dhaka North', ARRAY['pothole','garbage','waterlogging','street_light','electrical_failure','illegal_structure']),
      ('dscc', 'Dhaka South City Corporation', 'ঢাকা দক্ষিণ সিটি কর্পোরেশন', 'Dhaka South', ARRAY['pothole','garbage','waterlogging','street_light','illegal_structure']),
      ('wasa', 'Dhaka WASA', 'ঢাকা ওয়াসা', 'Dhaka', ARRAY['water_supply','sewage','waterlogging']),
      ('desco', 'DESCO', 'ডেসকো', 'Dhaka North', ARRAY['electrical_failure','street_light']),
      ('dpdc', 'DPDC', 'ডিপিডিসি', 'Dhaka South', ARRAY['electrical_failure','street_light']),
      ('rajuk', 'RAJUK', 'রাজউক', 'Dhaka', ARRAY['illegal_structure','road_damage'])
    ON CONFLICT (slug) DO NOTHING;
  `);

  await execSQL('users table', `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      reputation_score NUMERIC NOT NULL DEFAULT 0,
      total_reports INT NOT NULL DEFAULT 0,
      verified_reports INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await execSQL('authority_users table', `
    CREATE TABLE IF NOT EXISTS authority_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      department_id UUID NOT NULL REFERENCES departments(id),
      username TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'officer' CHECK (role IN ('admin','supervisor','officer')),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await execSQL('reports table', `
    CREATE TABLE IF NOT EXISTS reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      report_number TEXT UNIQUE NOT NULL,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      department_id UUID NOT NULL REFERENCES departments(id),
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','in_progress','resolved','rejected')),
      urgency_score NUMERIC NOT NULL DEFAULT 5,
      address TEXT NOT NULL DEFAULT '',
      ward_name TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      ai_verified BOOLEAN NOT NULL DEFAULT FALSE,
      is_flagged_fake BOOLEAN NOT NULL DEFAULT FALSE,
      image_count INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await execSQL('report_images table', `
    CREATE TABLE IF NOT EXISTS report_images (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      public_url TEXT NOT NULL,
      upload_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await execSQL('ai_analysis table', `
    CREATE TABLE IF NOT EXISTS ai_analysis (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      is_aggregate BOOLEAN NOT NULL DEFAULT FALSE,
      summary TEXT NOT NULL DEFAULT '',
      severity TEXT,
      confidence NUMERIC,
      tags TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await execSQL('activity_logs table', `
    CREATE TABLE IF NOT EXISTS activity_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      actor_type TEXT NOT NULL CHECK (actor_type IN ('citizen','authority','system')),
      actor_id TEXT NOT NULL DEFAULT '',
      action TEXT NOT NULL,
      details JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // RLS
  await execSQL('RLS on departments', `ALTER TABLE departments ENABLE ROW LEVEL SECURITY;`);
  await execSQL('RLS on users', `ALTER TABLE users ENABLE ROW LEVEL SECURITY;`);
  await execSQL('RLS on authority_users', `ALTER TABLE authority_users ENABLE ROW LEVEL SECURITY;`);
  await execSQL('RLS on reports', `ALTER TABLE reports ENABLE ROW LEVEL SECURITY;`);
  await execSQL('RLS on report_images', `ALTER TABLE report_images ENABLE ROW LEVEL SECURITY;`);
  await execSQL('RLS on ai_analysis', `ALTER TABLE ai_analysis ENABLE ROW LEVEL SECURITY;`);
  await execSQL('RLS on activity_logs', `ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;`);

  // Policies
  await execSQL('policy: departments public read', `
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='departments' AND policyname='departments_public_read') THEN
        CREATE POLICY departments_public_read ON departments FOR SELECT USING (TRUE);
      END IF;
    END $$;
  `);
  await execSQL('policy: authority_users self read', `
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='authority_users' AND policyname='authority_users_self_read') THEN
        CREATE POLICY authority_users_self_read ON authority_users FOR SELECT USING (auth_user_id = auth.uid());
      END IF;
    END $$;
  `);
  await execSQL('policy: reports authority read', `
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reports' AND policyname='reports_authority_read') THEN
        CREATE POLICY reports_authority_read ON reports FOR SELECT USING (
          department_id IN (SELECT department_id FROM authority_users WHERE auth_user_id = auth.uid() AND is_active = TRUE)
        );
      END IF;
    END $$;
  `);
  await execSQL('policy: reports authority update', `
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reports' AND policyname='reports_authority_update') THEN
        CREATE POLICY reports_authority_update ON reports FOR UPDATE USING (
          department_id IN (SELECT department_id FROM authority_users WHERE auth_user_id = auth.uid() AND is_active = TRUE)
        );
      END IF;
    END $$;
  `);
  await execSQL('policy: report_images authority read', `
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='report_images' AND policyname='report_images_authority_read') THEN
        CREATE POLICY report_images_authority_read ON report_images FOR SELECT USING (
          report_id IN (SELECT id FROM reports WHERE department_id IN (
            SELECT department_id FROM authority_users WHERE auth_user_id = auth.uid() AND is_active = TRUE
          ))
        );
      END IF;
    END $$;
  `);
  await execSQL('policy: ai_analysis authority read', `
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ai_analysis' AND policyname='ai_analysis_authority_read') THEN
        CREATE POLICY ai_analysis_authority_read ON ai_analysis FOR SELECT USING (
          report_id IN (SELECT id FROM reports WHERE department_id IN (
            SELECT department_id FROM authority_users WHERE auth_user_id = auth.uid() AND is_active = TRUE
          ))
        );
      END IF;
    END $$;
  `);
  await execSQL('policy: activity_logs authority read', `
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='activity_logs' AND policyname='activity_logs_authority_read') THEN
        CREATE POLICY activity_logs_authority_read ON activity_logs FOR SELECT USING (
          report_id IN (SELECT id FROM reports WHERE department_id IN (
            SELECT department_id FROM authority_users WHERE auth_user_id = auth.uid() AND is_active = TRUE
          ))
        );
      END IF;
    END $$;
  `);
  await execSQL('policy: activity_logs authority insert', `
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='activity_logs' AND policyname='activity_logs_authority_insert') THEN
        CREATE POLICY activity_logs_authority_insert ON activity_logs FOR INSERT WITH CHECK (
          report_id IN (SELECT id FROM reports WHERE department_id IN (
            SELECT department_id FROM authority_users WHERE auth_user_id = auth.uid() AND is_active = TRUE
          ))
        );
      END IF;
    END $$;
  `);
  await execSQL('policy: users authority read', `
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='users_authority_read') THEN
        CREATE POLICY users_authority_read ON users FOR SELECT USING (
          EXISTS (SELECT 1 FROM authority_users WHERE auth_user_id = auth.uid() AND is_active = TRUE)
        );
      END IF;
    END $$;
  `);

  console.log('\n  ✓ Schema ready\n');
}

async function createAuthUser(email, password) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    if (error.message.includes('already') || error.message.includes('registered')) {
      const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const existing = list?.users?.find(u => u.email === email);
      if (existing) {
        console.log(`  ⚠ Auth user ${email} already exists (${existing.id})`);
        return existing.id;
      }
    }
    throw new Error(`Auth user creation failed: ${error.message}`);
  }

  console.log(`  ✓ Auth user created: ${data.user.id}`);
  return data.user.id;
}

async function setupUsers() {
  console.log('👤 Creating auth users...\n');

  const authorityId = await createAuthUser('dncc_admin@authority.nagarik.seba', 'Demo@2025');
  const citizenId = await createAuthUser('demo_citizen@nagarik.seba', 'Demo@2025');

  console.log('\n👤 Inserting user profiles...\n');

  // Citizen profile
  const { error: cErr } = await supabase.from('users').upsert({
    id: citizenId,
    full_name: 'রাহেলা বেগম',
    phone: '01712345678',
    reputation_score: 78,
    total_reports: 12,
    verified_reports: 9,
  }, { onConflict: 'id' });
  if (cErr) console.warn('  ⚠ Citizen profile:', cErr.message);
  else console.log('  ✓ Citizen profile created');

  // Authority user
  const { data: dept } = await supabase.from('departments').select('id').eq('slug', 'dncc').single();
  if (!dept) throw new Error('DNCC department not found');

  const { error: aErr } = await supabase.from('authority_users').upsert({
    auth_user_id: authorityId,
    department_id: dept.id,
    username: 'dncc_admin',
    full_name: 'DNCC Admin Officer',
    role: 'admin',
    is_active: true,
  }, { onConflict: 'username' });
  if (aErr) throw new Error('Authority user creation failed: ' + aErr.message);
  console.log('  ✓ Authority user created (dncc_admin)');

  return { authorityId, citizenId, deptId: dept.id };
}

async function seedReports(deptId, citizenId) {
  console.log('\n📊 Seeding demo reports...\n');

  const categories = ['pothole', 'garbage', 'waterlogging', 'street_light', 'electrical_failure', 'pothole', 'garbage', 'waterlogging', 'pothole', 'street_light', 'waterlogging', 'pothole'];
  const statuses = ['submitted', 'under_review', 'in_progress', 'resolved', 'submitted', 'submitted', 'resolved', 'submitted', 'under_review', 'in_progress', 'submitted', 'rejected'];
  const urgencies = [9.2, 7.5, 8.8, 6.1, 8.0, 9.5, 5.0, 8.3, 7.8, 6.9, 9.1, 4.5];
  const wards = ['Ward 6', 'Ward 1', 'Ward 12', 'Ward 9', 'Ward 7', 'Ward 3', 'Ward 8', 'Ward 11', 'Ward 4', 'Ward 5', 'Ward 2', 'Ward 10'];
  const addresses = [
    'মিরপুর ১০, ঢাকা', 'উত্তরা সেক্টর ৪', 'বনশ্রী ব্লক এ', 'কল্যাণপুর, ঢাকা',
    'পল্লবী, ঢাকা', 'আগারগাঁও, ঢাকা', 'তেজগাঁও, ঢাকা', 'মোহাম্মদপুর, ঢাকা',
    'গুলশান ১, ঢাকা', 'বাড্ডা, ঢাকা', 'ভাটারা, ঢাকা', 'খিলক্ষেত, ঢাকা'
  ];
  const descriptions = [
    'রাস্তায় বড় গর্ত, গাড়ি চলতে পারছে না।',
    'ময়লা সংগ্রহ হচ্ছে না ৫ দিন ধরে।',
    'বৃষ্টির পরে পানি জমে আছে, যাতায়াত কঠিন।',
    'স্ট্রিট লাইট নষ্ট হয়ে গেছে।',
    'বিদ্যুৎ বিভ্রাট চলছে ২ দিন ধরে।',
    'সড়কে বিপজ্জনক গর্ত।',
    'ময়লার স্তূপ জমে আছে।',
    'ড্রেন বন্ধ হয়ে পানি উপচে পড়ছে।',
    'রাস্তার গর্তে মোটরসাইকেল দুর্ঘটনা হয়েছে।',
    'বেশ কয়েকটি লাইট নষ্ট, রাতে চলাচল বিপজ্জনক।',
    'ড্রেনেজ সিস্টেম বন্ধ।',
    'রাস্তার ক্ষতি মেরামতের দাবি।',
  ];
  const imageSlugs = ['pothole', 'garbage', 'flood', 'lamp', 'electric', 'road', 'waste', 'drain', 'accident', 'night', 'sewer', 'crack'];

  for (let i = 0; i < 12; i++) {
    const daysAgo = Math.floor(i * 2.5);
    const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString();
    const updatedAt = new Date(Date.now() - Math.max(0, daysAgo - 1) * 86400000).toISOString();
    const reportNum = `DHK-2025${String(i + 1).padStart(4, '0')}`;
    const aiVerified = i % 3 !== 2;

    const { data: report, error: rErr } = await supabase.from('reports').upsert({
      report_number: reportNum,
      user_id: citizenId,
      department_id: deptId,
      category: categories[i],
      status: statuses[i],
      urgency_score: urgencies[i],
      address: addresses[i],
      ward_name: wards[i],
      description: descriptions[i],
      ai_verified: aiVerified,
      is_flagged_fake: false,
      image_count: 1,
      created_at: createdAt,
      updated_at: updatedAt,
    }, { onConflict: 'report_number' }).select().single();

    if (rErr) { console.warn(`  ⚠ ${reportNum}: ${rErr.message}`); continue; }

    await supabase.from('report_images').upsert({
      report_id: report.id,
      public_url: `https://picsum.photos/seed/${imageSlugs[i]}${i}/800/600`,
      upload_order: 0,
    });

    if (aiVerified) {
      await supabase.from('ai_analysis').upsert({
        report_id: report.id,
        is_aggregate: true,
        summary: `AI বিশ্লেষণ: এই ${categories[i]} সমস্যাটি ${urgencies[i] > 8 ? 'অত্যন্ত জরুরি এবং অবিলম্বে ব্যবস্থা প্রয়োজন' : 'মধ্যম গুরুত্বপূর্ণ, দ্রুত সমাধান করা উচিত'}। ছবি বিশ্লেষণে সমস্যার সত্যতা নিশ্চিত করা হয়েছে।`,
        severity: urgencies[i] > 8 ? 'high' : urgencies[i] > 6 ? 'medium' : 'low',
        confidence: parseFloat((0.82 + (i % 5) * 0.03).toFixed(2)),
        tags: [categories[i], 'dhaka', 'urban'],
      });
    }

    await supabase.from('activity_logs').insert({
      report_id: report.id,
      actor_type: 'system',
      actor_id: 'system',
      action: 'report_submitted',
      details: { category: categories[i], urgency: urgencies[i], ward: wards[i] },
      created_at: createdAt,
    });

    if (statuses[i] !== 'submitted') {
      await supabase.from('activity_logs').insert({
        report_id: report.id,
        actor_type: 'authority',
        actor_id: 'dncc_admin',
        action: 'status_updated',
        details: { from: 'submitted', to: statuses[i], officer: 'DNCC Admin Officer', note: 'পরিদর্শন সম্পন্ন হয়েছে।' },
        created_at: updatedAt,
      });
    }

    console.log(`  ✓ ${reportNum} — ${categories[i]} (${statuses[i]}, urgency ${urgencies[i]})`);
  }
}

// Execute
try {
  await setupSchema();
  const { deptId, citizenId } = await setupUsers();
  await seedReports(deptId, citizenId);

  console.log('\n🎉 Setup complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Login: dncc_admin');
  console.log('  Password: Demo@2025');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
} catch (err) {
  console.error('\n❌ Setup error:', err.message);
  process.exit(1);
}
