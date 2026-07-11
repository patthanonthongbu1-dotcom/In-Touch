-- Optional sample data so the UI has something to show before the first
-- pipeline run. Run after schema.sql.

insert into articles
  (published_date, headline, source, source_url, category, summary, why_it_matters,
   difficulty, reading_time_min, importance, vocabulary, related)
values
(
  current_date,
  'Global leaders agree on landmark climate finance deal',
  'Sample News',
  'https://example.com/sample-climate-deal',
  'world',
  'Representatives from more than 190 countries reached a landmark agreement on climate finance after two weeks of tense negotiations. Wealthy nations pledged to mobilize $300 billion a year by 2035 to help developing countries adapt to rising temperatures and transition to clean energy. Critics argue the pledge falls short of what vulnerable nations requested, but supporters call it a crucial step forward. The deal also establishes a new framework for tracking whether countries actually deliver the money they promise.',
  'Climate finance decides whether developing countries can afford to cut emissions. This deal will shape global climate policy — and energy prices — for the next decade.',
  'B2', 3, 92,
  '[
    {"word":"landmark","meaning":"very important because it marks a major change or achievement","pronunciation":"/ˈlændmɑːrk/","partOfSpeech":"adjective","cefr":"B2","example":"The court issued a landmark ruling on privacy rights.","synonyms":["historic","groundbreaking"],"collocations":["landmark decision","landmark agreement"],"thai":"ครั้งสำคัญ, เป็นหมุดหมาย","whyUseful":"Extremely common in news headlines about big political or legal events."},
    {"word":"pledge","meaning":"to formally promise to do or give something","pronunciation":"/pledʒ/","partOfSpeech":"verb","cefr":"B2","example":"The government pledged $2 billion in aid.","synonyms":["promise","commit"],"collocations":["pledge support","pledge to invest"],"thai":"ให้คำมั่น","whyUseful":"Appears constantly in political and business news about promises of money or action."},
    {"word":"mobilize","meaning":"to organize resources or people for a purpose","pronunciation":"/ˈmoʊbəlaɪz/","partOfSpeech":"verb","cefr":"C1","example":"The charity mobilized volunteers within hours of the disaster.","synonyms":["marshal","rally"],"collocations":["mobilize funds","mobilize support"],"thai":"ระดม","whyUseful":"Key verb in finance and policy reporting about gathering money or support."},
    {"word":"fall short","meaning":"to fail to reach an expected amount or standard","pronunciation":"/fɔːl ʃɔːrt/","partOfSpeech":"phrasal verb","cefr":"B2","example":"Sales fell short of the company''s targets.","synonyms":["be insufficient","miss the mark"],"collocations":["fall short of expectations","fall short of a goal"],"thai":"ไม่ถึงเป้า, ขาดไป","whyUseful":"A go-to phrase in news for anything that misses a target — budgets, goals, promises."}
  ]'::jsonb,
  '["Developing nations criticise climate finance pledge", "What the new climate deal means for Asia"]'::jsonb
),
(
  current_date,
  'AI models now write most code at major tech firms, survey finds',
  'Sample Tech',
  'https://example.com/sample-ai-coding',
  'ai-tech',
  'A new industry survey suggests that artificial intelligence now generates the majority of new code at several large technology companies. Engineers increasingly act as reviewers and architects rather than writing every line themselves. The shift is boosting productivity but raising concerns about code quality, security vulnerabilities, and how junior developers will learn fundamental skills. Companies are responding by investing in automated testing and stricter review processes.',
  'If AI writes most code, the skills that make software engineers valuable are changing fast — affecting careers, education, and the tech industry''s hiring pipeline.',
  'B2', 2, 78,
  '[
    {"word":"shift","meaning":"a change in position, direction, or way of doing things","pronunciation":"/ʃɪft/","partOfSpeech":"noun","cefr":"B1","example":"There has been a shift toward remote work.","synonyms":["change","transition"],"collocations":["a major shift","shift in attitude"],"thai":"การเปลี่ยนแปลง","whyUseful":"One of the most frequent nouns in news for describing trends and changes."},
    {"word":"vulnerability","meaning":"a weakness that can be attacked or exploited","pronunciation":"/ˌvʌlnərəˈbɪləti/","partOfSpeech":"noun","cefr":"C1","example":"Hackers exploited a vulnerability in the login system.","synonyms":["weakness","flaw"],"collocations":["security vulnerability","expose a vulnerability"],"thai":"ช่องโหว่, จุดอ่อน","whyUseful":"Essential vocabulary for technology and cybersecurity news."},
    {"word":"pipeline","meaning":"the flow or supply of people or things moving through a process","pronunciation":"/ˈpaɪplaɪn/","partOfSpeech":"noun","cefr":"C1","example":"The company has several new drugs in the pipeline.","synonyms":["channel","supply chain"],"collocations":["hiring pipeline","in the pipeline"],"thai":"กระบวนการ/สายป้อน (คนหรือสิ่งของ)","whyUseful":"Used figuratively across business, tech, and career reporting."}
  ]'::jsonb,
  '["Junior developers rethink career paths in the AI era"]'::jsonb
)
on conflict (source_url) do nothing;
