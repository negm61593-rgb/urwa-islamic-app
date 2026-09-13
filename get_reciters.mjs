
import fetch from 'node-fetch';

async function getReciters() {
  try {
    const res = await fetch('https://api.quran.com/api/v4/resources/chapter_recitations?language=ar');
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}

getReciters();
