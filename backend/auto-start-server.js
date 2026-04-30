/**
 * 智能启动器 - 启动 AI 后端服务
 * 监听 HTTP 请求，启动对应的 AI 服务
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 4999;
const BACKEND_DIR = path.join(__dirname);

const services = {
  beginner: { process: null, port: 5002, script: 'api_server_beginner.py' },
  intermediate: { process: null, port: 5001, script: 'api_server_intermediate.py' },
  katago: { process: null, port: 5000, script: 'katago_api.py' }
};

function startService(name) {
  const svc = services[name];
  if (svc.process) {
    console.log(name + ' already running');
    return;
  }
  
  const modelPath = name !== 'katago' 
    ? 'C:\\Users\\24816\\Desktop\\围棋AI训练\\go_checkpoint.pth' 
    : '';
  
  const env = { ...process.env };
  if (name !== 'katago') {
    env.GO_MODEL_PATH = modelPath;
  } else {
    env.KATAGO_PORT = '5000';
    env.KATAGO_SIMULATIONS = '50';
  }
  
  console.log('Starting ' + name + '...');
  svc.process = spawn('python', [svc.script], {
    cwd: BACKEND_DIR,
    env,
    stdio: 'pipe'
  });
  
  svc.process.stdout?.on('data', (data) => {
    console.log('[' + name + '] ' + data);
  });
  
  svc.process.stderr?.on('data', (data) => {
    console.error('[' + name + ' ERROR] ' + data);
  });
  
  svc.process.on('error', (err) => {
    console.error(name + ' failed:', err);
    svc.process = null;
  });
  
  svc.process.on('exit', (code) => {
    console.log(name + ' exited with code ' + code);
    svc.process = null;
  });
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.url === '/health') {
    res.end(JSON.stringify({ status: 'ok', services: Object.keys(services) }));
    return;
  }
  
  if (req.url === '/start-beginner') { startService('beginner'); res.end('{"started":"beginner"}'); return; }
  if (req.url === '/start-intermediate') { startService('intermediate'); res.end('{"started":"intermediate"}'); return; }
  if (req.url === '/start-katago') { startService('katago'); res.end('{"started":"katago"}'); return; }
  
  res.end(JSON.stringify({ available: ['/start-beginner', '/start-intermediate', '/start-katago'] }));
});

server.listen(PORT, () => {
  console.log('Launcher running on http://localhost:' + PORT);
  console.log('Endpoints: /start-beginner, /start-intermediate, /start-katago');
});
