-- Insert sample profiles for testing
INSERT INTO profiles (id, email, full_name, role, subscription_tier, total_analyses) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@truthlens.com', 'Admin User', 'admin', 'enterprise', 150),
('00000000-0000-0000-0000-000000000002', 'user@example.com', 'John Doe', 'user', 'pro', 45),
('00000000-0000-0000-0000-000000000003', 'jane@example.com', 'Jane Smith', 'user', 'free', 12);

-- Insert sample fact checks
INSERT INTO fact_checks (id, user_id, content, credibility_score, analysis, sources, flags, confidence, methodology, timestamp) VALUES
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'The Earth is flat and NASA is hiding the truth.', 15, 'This claim contradicts overwhelming scientific evidence. The Earth is an oblate spheroid, as demonstrated by numerous independent observations and experiments.', '[{"title": "NASA Earth Fact Sheet", "url": "https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html", "credibility": "high"}, {"title": "International Space Station Live Feed", "url": "https://www.nasa.gov/live", "credibility": "high"}]'::jsonb, '["conspiracy theory", "scientifically disproven"]'::jsonb, 95, '["satellite imagery analysis", "physics principles", "historical observations"]'::jsonb, 1703980800),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'Vaccines cause autism in children.', 20, 'This claim has been thoroughly debunked by multiple large-scale studies. No credible scientific evidence supports a link between vaccines and autism.', '[{"title": "CDC Vaccine Safety", "url": "https://www.cdc.gov/vaccinesafety/", "credibility": "high"}, {"title": "Lancet Retraction", "url": "https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(10)60175-4/fulltext", "credibility": "high"}]'::jsonb, '["medical misinformation", "debunked study"]'::jsonb, 98, '["meta-analysis review", "epidemiological studies", "peer review"]'::jsonb, 1703894400),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Climate change is primarily caused by human activities.', 92, 'This statement is supported by overwhelming scientific consensus. Multiple lines of evidence demonstrate that current climate change is primarily driven by human greenhouse gas emissions.', '[{"title": "IPCC Climate Report", "url": "https://www.ipcc.ch/", "credibility": "high"}, {"title": "NASA Climate Evidence", "url": "https://climate.nasa.gov/evidence/", "credibility": "high"}]'::jsonb, '[]'::jsonb, 97, '["temperature records", "ice core analysis", "atmospheric measurements"]'::jsonb, 1703808000);

-- Insert sample bias analyses
INSERT INTO bias_analyses (id, user_id, content, political_bias, bias_confidence, emotional_tone, analysis, bias_indicators, bias_score, timestamp) VALUES
('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'The radical left-wing media is destroying our country with their fake news agenda.', 'right-leaning', 85, 'angry', 'This text exhibits strong right-leaning political bias with emotionally charged language. Terms like "radical left-wing" and "destroying our country" indicate partisan framing.', '["loaded language", "partisan terminology", "emotional appeals", "generalization"]'::jsonb, 78, 1703980800),
('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'We need comprehensive healthcare reform to ensure everyone has access to quality medical care.', 'slightly left-leaning', 35, 'hopeful', 'This text shows mild left-leaning bias toward expanded healthcare access, but uses relatively neutral language and focuses on policy outcomes rather than partisan attacks.', '["policy preference", "social welfare focus"]'::jsonb, 25, 1703894400),
('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'The quarterly earnings report shows steady growth across all sectors.', 'neutral', 15, 'neutral', 'This text appears to be factual reporting with minimal political bias. The language is objective and focuses on presenting information rather than advocating for a particular viewpoint.', '[]'::jsonb, 10, 1703808000);

-- Insert sample media verifications
INSERT INTO media_verifications (id, user_id, content, file_info, authenticity, technical_analysis, deepfake_analysis, manipulation_flags, recommendations, timestamp) VALUES
('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'suspicious_video.mp4', '{"filename": "suspicious_video.mp4", "size": 15728640, "type": "video/mp4", "duration": 45}'::jsonb, '{"score": 25, "confidence": 88}'::jsonb, '{"resolution": "1920x1080", "framerate": 30, "compression": "H.264"}'::jsonb, '{"likelihood": 75, "confidence": 88, "indicators": ["facial inconsistencies", "temporal artifacts"]}'::jsonb, '["potential deepfake", "facial manipulation"]'::jsonb, '["verify with original source", "cross-reference with known authentic media", "consult technical experts"]'::jsonb, 1703980800),
('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'family_photo.jpg', '{"filename": "family_photo.jpg", "size": 2048576, "type": "image/jpeg"}'::jsonb, '{"score": 95, "confidence": 92}'::jsonb, '{"resolution": "3024x4032", "exif_data": "present", "compression": "JPEG"}'::jsonb, '{"likelihood": 5, "confidence": 92, "indicators": []}'::jsonb, '[]'::jsonb, '["appears authentic", "no manipulation detected"]'::jsonb, 1703894400);

-- Insert sample user settings
INSERT INTO user_settings (user_id, settings) VALUES
('00000000-0000-0000-0000-000000000002', '{"notifications": {"email": true, "push": false}, "privacy": {"shareAnalytics": false}, "display": {"theme": "dark", "density": "comfortable"}}'::jsonb),
('00000000-0000-0000-0000-000000000003', '{"notifications": {"email": false, "push": true}, "privacy": {"shareAnalytics": true}, "display": {"theme": "light", "density": "compact"}}'::jsonb);

-- Insert sample subscriptions
INSERT INTO subscriptions (user_id, tier, status, current_period_start, current_period_end) VALUES
('00000000-0000-0000-0000-000000000001', 'enterprise', 'active', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days'),
('00000000-0000-0000-0000-000000000002', 'pro', 'active', NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days'),
('00000000-0000-0000-0000-000000000003', 'free', 'active', NOW() - INTERVAL '30 days', NOW() + INTERVAL '335 days');

-- Insert sample usage logs
INSERT INTO usage_logs (user_id, endpoint, method, status_code, response_time_ms, ip_address) VALUES
('00000000-0000-0000-0000-000000000002', '/api/fact-check', 'POST', 200, 1250, '192.168.1.100'),
('00000000-0000-0000-0000-000000000002', '/api/bias-analysis', 'POST', 200, 980, '192.168.1.100'),
('00000000-0000-0000-0000-000000000003', '/api/media-verify', 'POST', 200, 2340, '192.168.1.101'),
('00000000-0000-0000-0000-000000000003', '/api/fact-check', 'POST', 200, 1100, '192.168.1.101'),
('00000000-0000-0000-0000-000000000002', '/api/history', 'GET', 200, 450, '192.168.1.100');