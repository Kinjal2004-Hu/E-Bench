const localtunnel = require('localtunnel');
const fs = require('fs');

async function startTunnel() {
  console.log('🔄 Starting tunnel...');
  
  const tl = await localtunnel({ port: 4000 });
  
  console.log('✅ TUNNEL_URL:', tl.url);
  
  // Save URL to file
  fs.writeFileSync('./tunnel-url.txt', tl.url);
  
  tl.on('close', () => {
    console.log('❌ Tunnel closed, restarting...');
    startTunnel();
  });
  
  tl.on('error', (err) => {
    console.log('❌ Tunnel error:', err.message);
  });
  
  // Keep alive
  setInterval(() => {
    console.log('Tunnel alive:', tl.url);
  }, 30000);
}

startTunnel();