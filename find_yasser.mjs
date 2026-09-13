import fetch from 'node-fetch';

async function findReciters() {
  const res = await fetch('https://api.quran.com/api/v4/resources/recitations?language=ar');
  const data = await res.json();
  const yasserReciters = data.recitations.filter(r => r.reciter_name.includes('ياسر') || r.reciter_name.toLowerCase().includes('yasser'));
  console.log(JSON.stringify(yasserReciters, null, 2));
}

findReciters();
