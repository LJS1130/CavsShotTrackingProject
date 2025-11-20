import { spawn } from 'child_process';
import localtunnel from 'localtunnel';

const PORT = process.env.SERVER_PORT || 3000;

console.log('🚀 Starting server...\n');

// Start the server
const server = spawn('node', ['server/index.js'], {
  stdio: 'inherit',
  shell: true
});

// Wait a bit for server to start, then create tunnel
setTimeout(async () => {
  try {
    console.log('\n🌐 Creating public tunnel...\n');
    
    const tunnel = await localtunnel({
      port: PORT,
      subdomain: null // Let localtunnel assign a random subdomain
    });

    console.log('✅ Your app is now publicly accessible!');
    console.log(`\n🔗 Share this URL: ${tunnel.url}\n`);
    console.log('📝 Note: The tunnel will close when you stop this script (Ctrl+C)');
    console.log('💡 Tip: Keep this terminal open while sharing your app\n');

    tunnel.on('close', () => {
      console.log('\n⚠️  Tunnel closed');
    });

    // Cleanup on exit
    process.on('SIGINT', () => {
      console.log('\n\n👋 Closing tunnel and shutting down...');
      tunnel.close();
      server.kill();
      process.exit();
    });

  } catch (error) {
    console.error('❌ Failed to create tunnel:', error.message);
    console.log('\n💡 Alternative: You can manually install and run:');
    console.log('   npx localtunnel --port 3000\n');
    server.kill();
    process.exit(1);
  }
}, 3000);

server.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

