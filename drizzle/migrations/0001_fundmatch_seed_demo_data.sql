-- ============ DATA SOURCES ============
INSERT INTO public.data_sources (key,name,category,side,description,contributes,permissions,icon) VALUES
('google_workspace','Google Workspace','Productivity','both','Company docs, domain verification and team roster signals.',ARRAY['Domain / website','Team size','Document metadata'],ARRAY['Read directory profile','Read file metadata'],'📧'),
('microsoft_365','Microsoft 365','Productivity','investor','Calendar and mail metadata used to detect deal activity.',ARRAY['Meeting history','Deal activity signals'],ARRAY['Read calendar metadata','Read contact list'],'🗂️'),
('affinity','Affinity CRM','CRM','investor','Historic deal flow used to infer an investment thesis.',ARRAY['Past investments','Sector patterns','Check sizes'],ARRAY['Read organizations','Read deal stages'],'🧭'),
('pitchbook','PitchBook','Market data','investor','Market comparables, round history and valuation ranges.',ARRAY['Round history','Comparables','Valuation ranges'],ARRAY['Read company records'],'📊'),
('docsend','DocSend','Materials','both','Deck metadata and reader engagement analytics.',ARRAY['Deck metadata','Reader engagement'],ARRAY['Read document analytics'],'📄'),
('stripe','Stripe','Financial','founder','Revenue, growth and order volume straight from payments.',ARRAY['ARR / revenue','YoY growth','Order volume'],ARRAY['Read charges','Read subscriptions'],'💳'),
('hubspot','HubSpot','CRM','founder','Customer counts and pipeline signals from the founder CRM.',ARRAY['Active customers','Sales pipeline'],ARRAY['Read contacts','Read deals'],'🧲'),
('founder_input','Founder input','Manual','founder','Entered directly by the founding team in FundMatch.',ARRAY['Story','Funding ask','Stage'],ARRAY['None'],'✍️'),
('fundmatch_ai','FundMatch AI','Generated','both','Generated summaries, thesis inference and fit explanations.',ARRAY['AI summary','Fit explanation','Risks'],ARRAY['None'],'✨');

-- ============ ORGANIZATIONS ============
INSERT INTO public.organizations (id,name,type,website,description,logo_emoji,is_demo) VALUES
('ccccccc1-0000-4000-8000-000000000001','Dippi','startup','dippi.co','Fast alcohol delivery for local stores and consumers.','🍾',true),
('ccccccc1-0000-4000-8000-000000000002','Soapbox Caddie','startup','soapboxcaddie.com','Pickup-and-delivery laundry for busy households.','🧺',true),
('ccccccc1-0000-4000-8000-000000000003','Lattice Loop','startup','latticeloop.ai','Agent evaluation infrastructure for AI teams.','🧠',true),
('ccccccc1-0000-4000-8000-000000000004','Ledgerly','startup','ledgerly.io','Embedded accounting for vertical software.','📒',true),
('ccccccc1-0000-4000-8000-000000000005','Verdant Grid','startup','verdantgrid.com','Battery orchestration for commercial buildings.','🔋',true),
('ccccccc1-0000-4000-8000-000000000006','Kindred Table','startup','kindredtable.com','Community cooking marketplace for home chefs.','🍲',true),
('ccccccc1-0000-4000-8000-000000000007','Cargolyn','startup','cargolyn.com','Freight visibility for mid-market shippers.','🚚',true),
('ccccccc1-0000-4000-8000-000000000008','Northloop','startup','northloop.dev','Revenue workflow automation for B2B sales teams.','⚙️',true),
('ccccccc1-0000-4000-8000-000000000009','Paykit','startup','paykit.mx','Cross-border payouts for LatAm contractors.','💸',true),
('ccccccc1-0000-4000-8000-00000000000a','Solace Health','startup','solacehealth.co','Virtual musculoskeletal care for employers.','🩺',true),
('ccccccc1-0000-4000-8000-000000000101','Northstar Ventures','investment_firm','northstar.vc','Seed-stage marketplace and commerce specialist.','⭐',true),
('ccccccc1-0000-4000-8000-000000000102','Impact Partners','investment_firm','impactpartners.fund','Climate and health outcomes investing.','🌱',true),
('ccccccc1-0000-4000-8000-000000000103','GrowthWorks Capital','investment_firm','growthworks.capital','Series A/B growth capital for B2B software.','📈',true),
('ccccccc1-0000-4000-8000-000000000104','Meridian Seed Fund','investment_firm','meridianseed.com','Pre-seed and seed generalist with a fintech tilt.','🌅',true),
('ccccccc1-0000-4000-8000-000000000105','Sequoia Capital DEMO MATCH PROFILE','investment_firm','example.com','Illustrative demo record. Not affiliated with any real firm.','🧪',true);

-- ============ STARTUP PROFILES ============
INSERT INTO public.startup_profiles (id,org_id,name,tagline,summary,story,sector,stage,geography,website,funding_ask,tags,business_model,founded_year,team_size,brand_color,logo_emoji,ai_summary) VALUES
('aaaaaaa1-0000-4000-8000-000000000001','ccccccc1-0000-4000-8000-000000000001','Dippi','Fast alcohol delivery for local stores and consumers','Dippi connects neighbourhood liquor stores with consumers who want delivery in under 45 minutes, handling compliance, dispatch and payments end to end.','We started Dippi after watching independent stores lose weekend volume to national delivery apps that charge 30% and own the customer. Dippi keeps the store as the merchant of record and takes a flat platform fee.','Consumer','Seed','United States','dippi.co',3500000,ARRAY['On-demand delivery','Local commerce','Marketplace'],'Marketplace',2022,14,'#BFEED7','🍾','Dippi runs a compliance-heavy local delivery marketplace with strong repeat behaviour: 36K lifetime orders and 140% YoY growth on $1.8M ARR. The model keeps stores as merchant of record, which lowers licensing risk and improves merchant retention.'),
('aaaaaaa1-0000-4000-8000-000000000002','ccccccc1-0000-4000-8000-000000000002','Soapbox Caddie','Pickup-and-delivery laundry for busy households','Soapbox Caddie offers subscription laundry pickup and delivery, routing garments to vetted local cleaners with a two-day guarantee.','Two-income households outsource cleaning and groceries but still fold their own laundry. We built the routing and subscription layer so local cleaners can serve doorsteps without hiring drivers.','Consumer','Seed','United States','soapboxcaddie.com',2000000,ARRAY['Laundry delivery','Services marketplace','Subscriptions'],'Subscription',2021,11,'#8EA7FF','🧺','Soapbox Caddie converts an errand into a subscription: $920K ARR at 110% YoY growth with 9.2K active customers and high monthly retention driven by recurring plans rather than one-off orders.'),
('aaaaaaa1-0000-4000-8000-000000000003','ccccccc1-0000-4000-8000-000000000003','Lattice Loop','Evaluation infrastructure for AI agents','Lattice Loop gives AI teams regression testing, trace scoring and drift alerts for production agents.','Every team shipping agents rebuilds the same eval harness. We packaged it, with graders that run on each deploy.','AI','Series A','United States','latticeloop.ai',12000000,ARRAY['Developer tools','AI infrastructure','B2B SaaS'],'SaaS',2023,28,'#8EA7FF','🧠','Lattice Loop sells developer infrastructure into AI engineering teams. $4.2M ARR with 190% YoY growth and usage-based expansion inside existing accounts.'),
('aaaaaaa1-0000-4000-8000-000000000004','ccccccc1-0000-4000-8000-000000000004','Ledgerly','Embedded accounting for vertical software','Ledgerly lets vertical SaaS platforms offer bookkeeping and tax-ready reporting to their SMB customers via API.','Vertical platforms already own the transaction. Ledgerly turns that into a monetisable accounting product without an accounting team.','Fintech','Series A','United Kingdom','ledgerly.io',9000000,ARRAY['Embedded finance','B2B SaaS','API-first'],'SaaS',2021,34,'#BFEED7','📒','Ledgerly monetises platform partnerships rather than direct SMB acquisition: $5.6M ARR, 95% YoY growth, and revenue concentrated across 18 platform partners.'),
('aaaaaaa1-0000-4000-8000-000000000005','ccccccc1-0000-4000-8000-000000000005','Verdant Grid','Battery orchestration for commercial buildings','Verdant Grid optimises on-site batteries and HVAC load to cut demand charges and sell grid services.','Buildings already have the hardware. The missing piece is software that can bid capacity into utility programmes safely.','Climate','Seed','Germany','verdantgrid.com',4500000,ARRAY['Energy software','Hardware-enabled','B2B SaaS'],'SaaS',2022,19,'#BFEED7','🔋','Verdant Grid combines software margins with hardware-dependent deployment cycles: $1.4M ARR, 130% YoY growth, and contracted savings across 62 commercial sites.'),
('aaaaaaa1-0000-4000-8000-000000000006','ccccccc1-0000-4000-8000-000000000006','Kindred Table','Community cooking marketplace','Kindred Table lets vetted home chefs sell prepared meals to neighbours within a two-mile radius.','Food halls are expensive and delivery apps commoditise the cook. We give home chefs a licensed route to local customers.','Consumer','Pre-Seed','United States','kindredtable.com',1200000,ARRAY['Local commerce','Marketplace','Food'],'Marketplace',2024,6,'#8EA7FF','🍲','Kindred Table is early but dense: $210K ARR, 260% YoY growth off a small base, concentrated in three metro clusters with strong weekly repeat ordering.'),
('aaaaaaa1-0000-4000-8000-000000000007','ccccccc1-0000-4000-8000-000000000007','Cargolyn','Freight visibility for mid-market shippers','Cargolyn ingests carrier telemetry and gives mid-market shippers exception alerts and shipment-level margin data.','Enterprise TMS suites price out mid-market shippers. Cargolyn is the visibility layer they can actually deploy in a week.','Logistics','Series A','United States','cargolyn.com',10000000,ARRAY['Supply chain','B2B SaaS','Data'],'SaaS',2020,41,'#8EA7FF','🚚','Cargolyn has durable enterprise-style retention in a mid-market segment: $6.8M ARR, 70% YoY growth, 118% net revenue retention.'),
('aaaaaaa1-0000-4000-8000-000000000008','ccccccc1-0000-4000-8000-000000000008','Northloop','Revenue workflow automation','Northloop automates CRM hygiene, handoffs and renewal tasks for B2B revenue teams.','RevOps teams live in spreadsheets between CRM and billing. Northloop replaces that glue with reliable workflows.','B2B SaaS','Seed','Canada','northloop.dev',5000000,ARRAY['RevOps','Workflow automation','B2B SaaS'],'SaaS',2022,17,'#BFEED7','⚙️','Northloop lands in RevOps and expands by seat: $2.1M ARR with 145% YoY growth and a short 21-day median sales cycle.'),
('aaaaaaa1-0000-4000-8000-000000000009','ccccccc1-0000-4000-8000-000000000009','Paykit','Cross-border payouts for LatAm contractors','Paykit handles compliant USD-to-local payouts, invoicing and tax documents for companies hiring in Latin America.','Remote hiring in LatAm is growing faster than the payout rails supporting it.','Fintech','Seed','Mexico','paykit.mx',6000000,ARRAY['Payments','Cross-border','B2B SaaS'],'Transactional',2023,22,'#8EA7FF','💸','Paykit earns on FX spread plus per-contractor fees: $1.9M ARR, 180% YoY growth, and payout volume growing faster than headcount.'),
('aaaaaaa1-0000-4000-8000-00000000000a','ccccccc1-0000-4000-8000-00000000000a','Solace Health','Virtual musculoskeletal care','Solace Health delivers virtual physical therapy programmes sold through employer benefits channels.','MSK is the top employer cost line after cardiometabolic care, and access is the bottleneck.','Healthcare','Series A','United States','solacehealth.co',15000000,ARRAY['Digital health','Employer benefits','Subscriptions'],'Subscription',2020,52,'#BFEED7','🩺','Solace Health sells into employer benefits with long cycles but sticky contracts: $8.4M ARR, 60% YoY growth, 94% employer renewal.');

-- ============ METRICS ============
INSERT INTO public.company_metrics (startup_id,metric_key,label,value_numeric,value_display,period,source_key) VALUES
('aaaaaaa1-0000-4000-8000-000000000001','arr','ARR',1800000,'$1.8M','TTM','stripe'),
('aaaaaaa1-0000-4000-8000-000000000001','growth','YoY growth',140,'140%','TTM','stripe'),
('aaaaaaa1-0000-4000-8000-000000000001','orders','Lifetime orders',36000,'36K','All time','stripe'),
('aaaaaaa1-0000-4000-8000-000000000001','team','Team size',14,'14','Current','google_workspace'),
('aaaaaaa1-0000-4000-8000-000000000002','arr','ARR',920000,'$920K','TTM','stripe'),
('aaaaaaa1-0000-4000-8000-000000000002','growth','YoY growth',110,'110%','TTM','stripe'),
('aaaaaaa1-0000-4000-8000-000000000002','customers','Active customers',9200,'9.2K','Monthly','hubspot'),
('aaaaaaa1-0000-4000-8000-000000000002','team','Team size',11,'11','Current','google_workspace'),
('aaaaaaa1-0000-4000-8000-000000000003','arr','ARR',4200000,'$4.2M','TTM','stripe'),
('aaaaaaa1-0000-4000-8000-000000000003','growth','YoY growth',190,'190%','TTM','stripe'),
('aaaaaaa1-0000-4000-8000-000000000003','customers','Paying teams',210,'210','Monthly','hubspot'),
('aaaaaaa1-0000-4000-8000-000000000003','team','Team size',28,'28','Current','google_workspace'),
('aaaaaaa1-0000-4000-8000-000000000004','arr','ARR',5600000,'$5.6M','TTM','stripe'),
('aaaaaaa1-0000-4000-8000-000000000004','growth','YoY growth',95,'95%','TTM','stripe'),
('aaaaaaa1-0000-4000-8000-000000000004','customers','Platform partners',18,'18','Current','hubspot'),
('aaaaaaa1-0000-4000-8000-000000000004','team','Team size',34,'34','Current','google_workspace'),
('aaaaaaa1-0000-4000-8000-000000000005','arr','ARR',1400000,'$1.4M','TTM','stripe'),
('aaaaaaa1-0000-4000-8000-000000000005','growth','YoY growth',130,'130%','TTM','stripe'),
('aaaaaaa1-0000-4000-8000-000000000005','customers','Live sites',62,'62','Current','hubspot'),
('aaaaaaa1-0000-4000-8000-000000000005','team','Team size',19,'19','Current','google_workspace'),
('aaaaaaa1-0000-4000-8000-000000000006','arr','ARR',210000,'$210K','TTM','stripe'),
('aaaaaaa1-0000-4000-8000-000000000006','growth','YoY growth',260,'260%','TTM','stripe'),
('aaaaaaa1-0000-4000-8000-000000000006','orders','Monthly orders',4100,'4.1K','Monthly','stripe'),
('aaaaaaa1-0000-4000-8000-000000000006','team','Team size',6,'6','Current','google_workspace'),
('aaaaaaa1-0000-4000-8000-000000000007','arr','ARR',6800000,'$6.8M','TTM','stripe'),
('aaaaaaa1-0000-4000-8000-000000000007','growth','YoY growth',70,'70%','TTM','stripe'),
('aaaaaaa1-0000-4000-8000-000000000007','customers','Shippers',146,'146','Current','hubspot'),
('aaaaaaa1-0000-4000-8000-000000000007','team','Team size',41,'41','Current','google_workspace'),
('aaaaaaa1-0000-4000-8000-000000000008','arr','ARR',2100000,'$2.1M','TTM','stripe'),
('aaaaaaa1-0000-4000-8000-000000000008','growth','YoY growth',145,'145%','TTM','stripe'),
('aaaaaaa1-0000-4000-8000-000000000008','customers','Customers',188,'188','Current','hubspot'),
('aaaaaaa1-0000-4000-8000-000000000008','team','Team size',17,'17','Current','google_workspace'),
('aaaaaaa1-0000-4000-8000-000000000009','arr','ARR',1900000,'$1.9M','TTM','stripe'),
('aaaaaaa1-0000-4000-8000-000000000009','growth','YoY growth',180,'180%','TTM','stripe'),
('aaaaaaa1-0000-4000-8000-000000000009','customers','Companies paying out',320,'320','Monthly','hubspot'),
('aaaaaaa1-0000-4000-8000-000000000009','team','Team size',22,'22','Current','google_workspace'),
('aaaaaaa1-0000-4000-8000-00000000000a','arr','ARR',8400000,'$8.4M','TTM','stripe'),
('aaaaaaa1-0000-4000-8000-00000000000a','growth','YoY growth',60,'60%','TTM','stripe'),
('aaaaaaa1-0000-4000-8000-00000000000a','customers','Employer contracts',74,'74','Current','hubspot'),
('aaaaaaa1-0000-4000-8000-00000000000a','team','Team size',52,'52','Current','google_workspace');

-- ============ MATERIALS ============
INSERT INTO public.founder_materials (startup_id,title,kind,url,size_label,source_key) VALUES
('aaaaaaa1-0000-4000-8000-000000000001','Dippi Seed Deck','deck','https://docsend.example.com/dippi-seed','14 slides','docsend'),
('aaaaaaa1-0000-4000-8000-000000000001','Unit economics model','spreadsheet','https://docs.example.com/dippi-model','1.2 MB','google_workspace'),
('aaaaaaa1-0000-4000-8000-000000000001','Compliance overview','doc','https://docs.example.com/dippi-compliance','6 pages','google_workspace'),
('aaaaaaa1-0000-4000-8000-000000000002','Soapbox Caddie Deck','deck','https://docsend.example.com/soapbox-seed','12 slides','docsend'),
('aaaaaaa1-0000-4000-8000-000000000002','Cohort retention export','spreadsheet','https://docs.example.com/soapbox-cohorts','780 KB','stripe'),
('aaaaaaa1-0000-4000-8000-000000000003','Lattice Loop Series A Deck','deck','https://docsend.example.com/lattice-a','18 slides','docsend'),
('aaaaaaa1-0000-4000-8000-000000000004','Ledgerly partner economics','doc','https://docs.example.com/ledgerly-partners','9 pages','google_workspace'),
('aaaaaaa1-0000-4000-8000-000000000005','Verdant Grid pilot results','doc','https://docs.example.com/verdant-pilots','11 pages','google_workspace'),
('aaaaaaa1-0000-4000-8000-000000000007','Cargolyn ARR bridge','spreadsheet','https://docs.example.com/cargolyn-arr','2.1 MB','stripe'),
('aaaaaaa1-0000-4000-8000-00000000000a','Solace Health clinical outcomes','doc','https://docs.example.com/solace-outcomes','22 pages','google_workspace');

-- ============ PROVENANCE ============
INSERT INTO public.source_provenance (startup_id,field_key,field_label,source_key,confidence,value_preview)
SELECT s.id,'arr','ARR','stripe',0.97,(SELECT value_display FROM public.company_metrics m WHERE m.startup_id=s.id AND m.metric_key='arr') FROM public.startup_profiles s;
INSERT INTO public.source_provenance (startup_id,field_key,field_label,source_key,confidence,value_preview)
SELECT s.id,'growth','YoY growth','stripe',0.94,(SELECT value_display FROM public.company_metrics m WHERE m.startup_id=s.id AND m.metric_key='growth') FROM public.startup_profiles s;
INSERT INTO public.source_provenance (startup_id,field_key,field_label,source_key,confidence,value_preview)
SELECT s.id,'team','Team size','google_workspace',0.88,s.team_size::text FROM public.startup_profiles s;
INSERT INTO public.source_provenance (startup_id,field_key,field_label,source_key,confidence,value_preview)
SELECT s.id,'website','Website / domain','google_workspace',0.99,s.website FROM public.startup_profiles s;
INSERT INTO public.source_provenance (startup_id,field_key,field_label,source_key,confidence,value_preview)
SELECT s.id,'funding_ask','Funding ask','founder_input',1.0,'$'||round(s.funding_ask/1000000.0,1)||'M' FROM public.startup_profiles s;
INSERT INTO public.source_provenance (startup_id,field_key,field_label,source_key,confidence,value_preview)
SELECT s.id,'stage','Stage','founder_input',1.0,s.stage FROM public.startup_profiles s;
INSERT INTO public.source_provenance (startup_id,field_key,field_label,source_key,confidence,value_preview)
SELECT s.id,'ai_summary','AI summary','fundmatch_ai',0.72,'Generated from source fields' FROM public.startup_profiles s;
INSERT INTO public.source_provenance (startup_id,field_key,field_label,source_key,confidence,value_preview)
SELECT s.id,'deck','Pitch deck','docsend',0.9,'Latest deck version' FROM public.startup_profiles s WHERE s.id IN ('aaaaaaa1-0000-4000-8000-000000000001','aaaaaaa1-0000-4000-8000-000000000002','aaaaaaa1-0000-4000-8000-000000000003');
INSERT INTO public.source_provenance (startup_id,field_key,field_label,source_key,confidence,value_preview)
SELECT s.id,'customers','Customer count','hubspot',0.85,(SELECT value_display FROM public.company_metrics m WHERE m.startup_id=s.id AND m.metric_key IN ('customers','orders') LIMIT 1) FROM public.startup_profiles s;

-- ============ INVESTORS ============
INSERT INTO public.investor_profiles (id,org_id,firm_name,description,hq,aum_label,logo_emoji,demo_label) VALUES
('bbbbbbb1-0000-4000-8000-000000000001','ccccccc1-0000-4000-8000-000000000101','Northstar Ventures','Seed specialist in marketplaces, local commerce and consumer services.','New York, US','$220M AUM','⭐','Fictional demo firm'),
('bbbbbbb1-0000-4000-8000-000000000002','ccccccc1-0000-4000-8000-000000000102','Impact Partners','Climate and health investing with measurable outcome targets.','Berlin, DE','$400M AUM','🌱','Fictional demo firm'),
('bbbbbbb1-0000-4000-8000-000000000003','ccccccc1-0000-4000-8000-000000000103','GrowthWorks Capital','Series A/B capital for B2B software with durable retention.','San Francisco, US','$750M AUM','📈','Fictional demo firm'),
('bbbbbbb1-0000-4000-8000-000000000004','ccccccc1-0000-4000-8000-000000000104','Meridian Seed Fund','Pre-seed and seed generalist with a fintech and payments tilt.','London, UK','$120M AUM','🌅','Fictional demo firm'),
('bbbbbbb1-0000-4000-8000-000000000005','ccccccc1-0000-4000-8000-000000000105','Sequoia Capital DEMO MATCH PROFILE','Illustrative demo record used to show a multi-stage thesis. Not affiliated with, endorsed by, or representative of any real firm.','Demo','Demo record','🧪','DEMO DATA — not a real firm profile');

INSERT INTO public.investor_theses (investor_id,summary,sectors,stages,geographies,business_models,exclusions,check_min,check_max,min_growth_pct,inferred,inferred_from) VALUES
('bbbbbbb1-0000-4000-8000-000000000001','We back seed-stage marketplaces and local commerce businesses in North America where repeat behaviour shows up in the first 90 days. Typical first cheque is $1.5M–$4M.',ARRAY['Consumer','Logistics'],ARRAY['Pre-Seed','Seed'],ARRAY['United States','Canada'],ARRAY['Marketplace','Subscription'],ARRAY['Gambling','Defence'],1500000,4000000,80,false,ARRAY[]::text[]),
('bbbbbbb1-0000-4000-8000-000000000002','Climate and healthcare companies with measurable outcomes, mostly in Europe, at seed through Series A. Cheques from $2M to $8M.',ARRAY['Climate','Healthcare'],ARRAY['Seed','Series A'],ARRAY['Germany','United Kingdom','United States'],ARRAY['SaaS','Subscription'],ARRAY['Fossil fuels'],2000000,8000000,50,false,ARRAY[]::text[]),
('bbbbbbb1-0000-4000-8000-000000000003','Series A and B B2B software with net revenue retention above 110% and clear expansion motion. Cheques $8M–$20M.',ARRAY['B2B SaaS','AI','Logistics'],ARRAY['Series A','Series B'],ARRAY['United States','Canada','United Kingdom'],ARRAY['SaaS'],ARRAY['Consumer social'],8000000,20000000,60,true,ARRAY['affinity','microsoft_365']),
('bbbbbbb1-0000-4000-8000-000000000004','Pre-seed and seed generalist, strongest conviction in payments and embedded finance across Europe and LatAm. Cheques $500K–$3M.',ARRAY['Fintech','B2B SaaS','Consumer'],ARRAY['Pre-Seed','Seed'],ARRAY['United Kingdom','Mexico','Germany'],ARRAY['Transactional','SaaS','Marketplace'],ARRAY['Crypto trading'],500000,3000000,70,true,ARRAY['affinity']),
('bbbbbbb1-0000-4000-8000-000000000005','DEMO PROFILE. Multi-stage thesis across AI infrastructure, fintech and consumer, used only to demonstrate cross-stage matching in FundMatch.',ARRAY['AI','Fintech','Consumer','B2B SaaS'],ARRAY['Seed','Series A'],ARRAY['United States','United Kingdom','Mexico'],ARRAY['SaaS','Marketplace','Transactional'],ARRAY[]::text[],3000000,15000000,90,false,ARRAY[]::text[]);

-- ============ INTEGRATIONS ============
INSERT INTO public.integrations (org_id,source_key,status,mode,connected_at,last_sync_at) VALUES
('ccccccc1-0000-4000-8000-000000000001','stripe','connected','demo',now()-interval '21 days',now()-interval '3 hours'),
('ccccccc1-0000-4000-8000-000000000001','google_workspace','connected','demo',now()-interval '30 days',now()-interval '1 day'),
('ccccccc1-0000-4000-8000-000000000001','docsend','connected','demo',now()-interval '12 days',now()-interval '9 hours'),
('ccccccc1-0000-4000-8000-000000000001','hubspot','available','demo',null,null),
('ccccccc1-0000-4000-8000-000000000002','stripe','connected','demo',now()-interval '18 days',now()-interval '5 hours'),
('ccccccc1-0000-4000-8000-000000000002','hubspot','connected','demo',now()-interval '10 days',now()-interval '2 days'),
('ccccccc1-0000-4000-8000-000000000002','google_workspace','available','demo',null,null),
('ccccccc1-0000-4000-8000-000000000002','docsend','available','demo',null,null),
('ccccccc1-0000-4000-8000-000000000101','affinity','connected','demo',now()-interval '40 days',now()-interval '6 hours'),
('ccccccc1-0000-4000-8000-000000000101','google_workspace','connected','demo',now()-interval '40 days',now()-interval '1 day'),
('ccccccc1-0000-4000-8000-000000000101','pitchbook','available','demo',null,null),
('ccccccc1-0000-4000-8000-000000000101','microsoft_365','available','demo',null,null),
('ccccccc1-0000-4000-8000-000000000101','docsend','connected','demo',now()-interval '8 days',now()-interval '4 hours');

-- ============ PIPELINE / NOTES / ACTIVITY / INTROS ============
INSERT INTO public.pipeline_items (investor_id,startup_id,status,last_note) VALUES
('bbbbbbb1-0000-4000-8000-000000000001','aaaaaaa1-0000-4000-8000-000000000001','reviewing','Strong repeat rate. Need licensing detail per state.'),
('bbbbbbb1-0000-4000-8000-000000000001','aaaaaaa1-0000-4000-8000-000000000002','meeting','Founder call booked for Thursday.'),
('bbbbbbb1-0000-4000-8000-000000000001','aaaaaaa1-0000-4000-8000-000000000006','new','Inbound from Discover.'),
('bbbbbbb1-0000-4000-8000-000000000001','aaaaaaa1-0000-4000-8000-000000000007','passed','Above our stage and cheque size.'),
('bbbbbbb1-0000-4000-8000-000000000003','aaaaaaa1-0000-4000-8000-000000000003','reviewing','Eval infra category is crowded; retention looks real.'),
('bbbbbbb1-0000-4000-8000-000000000003','aaaaaaa1-0000-4000-8000-000000000007','meeting','Second meeting with the ops team.');

INSERT INTO public.team_notes (startup_id,investor_id,author_name,body,likes,created_at) VALUES
('aaaaaaa1-0000-4000-8000-000000000001','bbbbbbb1-0000-4000-8000-000000000001','Priya Raman','Repeat purchase within 30 days is 48%, which is the number that matters here. Worth a deeper look at driver supply costs.',3,now()-interval '4 days'),
('aaaaaaa1-0000-4000-8000-000000000001','bbbbbbb1-0000-4000-8000-000000000001','Marcus Hill','Licensing is the open question. Merchant-of-record structure helps but we should see the state-by-state map.',1,now()-interval '2 days'),
('aaaaaaa1-0000-4000-8000-000000000002','bbbbbbb1-0000-4000-8000-000000000001','Priya Raman','Subscription mix is 71% of revenue. Churn is 4.1% monthly, acceptable at this stage.',2,now()-interval '3 days'),
('aaaaaaa1-0000-4000-8000-000000000003','bbbbbbb1-0000-4000-8000-000000000003','Dana Whitfield','Expansion is usage-based, so ARR quality depends on agent volume growth in their accounts.',4,now()-interval '6 days');

INSERT INTO public.activity_events (startup_id,investor_id,kind,description,created_at) VALUES
('aaaaaaa1-0000-4000-8000-000000000001','bbbbbbb1-0000-4000-8000-000000000001','view','Northstar Ventures viewed the profile',now()-interval '6 hours'),
('aaaaaaa1-0000-4000-8000-000000000001','bbbbbbb1-0000-4000-8000-000000000004','view','Meridian Seed Fund viewed the profile',now()-interval '1 day'),
('aaaaaaa1-0000-4000-8000-000000000001','bbbbbbb1-0000-4000-8000-000000000001','save','Northstar Ventures saved Dippi',now()-interval '2 days'),
('aaaaaaa1-0000-4000-8000-000000000001','bbbbbbb1-0000-4000-8000-000000000005','view','Sequoia Capital DEMO MATCH PROFILE viewed the profile',now()-interval '3 days'),
('aaaaaaa1-0000-4000-8000-000000000001',null,'sync','Stripe demo sync refreshed ARR and order volume',now()-interval '3 hours'),
('aaaaaaa1-0000-4000-8000-000000000002','bbbbbbb1-0000-4000-8000-000000000001','interested','Northstar Ventures marked Soapbox Caddie as interested',now()-interval '1 day'),
('aaaaaaa1-0000-4000-8000-000000000002','bbbbbbb1-0000-4000-8000-000000000004','view','Meridian Seed Fund viewed the profile',now()-interval '2 days'),
('aaaaaaa1-0000-4000-8000-000000000002',null,'sync','HubSpot demo sync refreshed active customers',now()-interval '2 days'),
('aaaaaaa1-0000-4000-8000-000000000003','bbbbbbb1-0000-4000-8000-000000000003','view','GrowthWorks Capital viewed the profile',now()-interval '5 hours');

INSERT INTO public.intro_requests (startup_id,investor_id,message,status,created_at) VALUES
('aaaaaaa1-0000-4000-8000-000000000001','bbbbbbb1-0000-4000-8000-000000000001','We would like 30 minutes with the founding team to walk through unit economics.','pending',now()-interval '1 day'),
('aaaaaaa1-0000-4000-8000-000000000002','bbbbbbb1-0000-4000-8000-000000000004','Interested in the subscription retention data.','pending',now()-interval '4 days');