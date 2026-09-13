
async function findReciters() {
  const response = await fetch('https://www.mp3quran.net/api/v3/reciters?language=ar');
  const data = await response.json();
  const namesToFind = ["السديس"];
  
  const results = data.reciters.filter(r => namesToFind.some(name => r.name.includes(name)));
  
  results.forEach(r => {
    console.log(`Name: ${r.name}, ID: ${r.id}`);
    r.moshaf.forEach(m => {
      console.log(`  Moshaf: ${m.name}, Server: ${m.server}`);
    });
  });
}

findReciters();
