import type { IncomingMessage, ServerResponse } from 'http';

interface VercelRequest extends IncomingMessage {
  query: { [key: string]: string | string[] };
  cookies: { [key: string]: string };
  body: any;
}

interface VercelResponse extends ServerResponse {
  send?: (body: any) => VercelResponse;
  json?: (jsonBody: any) => VercelResponse;
  status?: (statusCode: number) => VercelResponse;
}

// Fallback corrugation plant database and domain reasoning generator
function getCorrugationDomainFallback(query: string, databaseContext?: any): string {
  const q = (query || '').toLowerCase();

  const jobs = Array.isArray(databaseContext?.jobs) ? databaseContext.jobs : [];
  const inv = Array.isArray(databaseContext?.inventory) ? databaseContext.inventory : [];

  const pending = jobs.filter((j: any) => j.status === 'Pending');
  const notCompleted = jobs.filter((j: any) => j.status === 'Not Completed');
  const completed = jobs.filter((j: any) => j.status === 'Completed');
  const awaitingInventory = jobs.filter((j: any) => !j.hasInventory);
  const totalUnits = inv.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0), 0);

  // If query is asking about database contents, jobs, inventory, or workflow planning
  if (databaseContext && (q.includes('job') || q.includes('pending') || q.includes('inventory') || q.includes('stock') || q.includes('database') || q.includes('queue') || q.includes('audit') || q.includes('bottleneck') || q.includes('complete'))) {
    let text = `⚡ **Plant Diagnostic & Thinking Summary**\n\n`;

    if (jobs.length === 0 && inv.length === 0) {
      text += `• **Status**: Database clean (0 jobs, 0 inventory). Optimal window for roll calibration & starch loop flushing.\n`;
      text += `• **Recommendation**: Add pending jobs or order inventory to commence production tracking.\n`;
    } else {
      text += `• **Queue**: **${jobs.length} total jobs** (${pending.length} pending, ${notCompleted.length} incomplete, ${completed.length} completed).\n`;
      if (awaitingInventory.length > 0) {
        text += `• ⚠️ **Shortage Warning**: **${awaitingInventory.length} jobs** (${awaitingInventory.map((j: any) => j.jobName).slice(0, 3).join(', ')}${awaitingInventory.length > 3 ? '...' : ''}) lack raw paper inventory.\n`;
      }
      if (notCompleted.length > 0) {
        text += `• 🚨 **Halted Runs**: Job(s) ${notCompleted.map((j: any) => `"${j.jobName}"`).join(', ')} marked Incomplete. Root cause check: moisture differential > 2.5%, starch bond failure, or slit cracking.\n`;
      }
      text += `• 📦 **Inventory Lots**: ${inv.length} lots totaling **${totalUnits.toLocaleString()} units** (${inv.filter((i: any) => i.isUrgent).length} marked Urgent).\n`;
      text += `• 🎯 **Immediate Action**: 1. Allocate paper for unlinked jobs. 2. Verify glue gap (0.22mm) & gel temp (58-62°C) on line.\n`;
    }

    return text;
  }

  if (q.includes('warp')) {
    return `⚡ **Warp Diagnostics & Fixes**\n\n` +
      `• **Up-Warp**: Bottom liner shrank more. Fix: Increase wrap on bottom pre-heater drum, reduce glue gap (target 0.22mm), increase corrugator line speed.\n` +
      `• **Down-Warp**: Top liner shrank more. Fix: Increase wrap on single-face web pre-heater, decrease bottom pre-heater wrap, reduce single-facer steam showers.\n` +
      `• **S-Warp (Twist)**: Cross-directional moisture delta > 2%. Inspect paper moisture profile and roll parallelism.`;
  }

  if (q.includes('bct') || q.includes('ect') || q.includes('mullens') || q.includes('burst')) {
    return `### 🧠 Structural Packaging Engineering: McKee BCT Calculation\n\n` +
      `The McKee formula predicts the top-to-bottom compression strength of a finished Regular Slotted Carton (RSC):\n\n` +
      `$$\\text{BCT} = 5.876 \\times \\text{ECT} \\times \\sqrt{h \\times Z}$$\n\n` +
      `- **ECT**: Edge Crush Test of combined board (kN/m or lb/in).\n` +
      `- **h**: Caliper / board thickness (mm or in) - dependent on flute profile (C-flute ~3.6mm, B-flute ~2.5mm, BC ~6.1mm).\n` +
      `- **Z**: Box perimeter ($2 \\times [\\text{Length} + \\text{Width}]$).\n\n` +
      `#### Critical Engineering Considerations:\n` +
      `- **Environmental Safety Factor**: Apply a degradation multiplier of 3.5× – 5.0× for long-term warehouse stacking (90 days at 80% Relative Humidity causes ~50% strength drop).\n` +
      `- **Flute Damage**: Printing nip over-pressure crushes flutes, reducing caliper $h$ by up to 15%, which directly reduces total BCT by ~8%.`;
  }

  if (q.includes('starch') || q.includes('glue') || q.includes('adhesive')) {
    return `### 🧠 Starch Adhesive Chemistry & Thermal Gelatinization\n\n` +
      `Corrugator starch adhesive uses a Stein-Hall two-part formulation: carrier starch (cooked, provides viscosity) and primary starch (raw slurry, provides green bond).\n\n` +
      `#### Crucial Process Targets:\n` +
      `- **Gelatinization Temperature**: **58°C – 62°C (136°F – 144°F)**. Regulated by caustic soda (NaOH) dosage. If gel temp > 64°C, starch cannot cook fast enough at high line speeds, causing delamination.\n` +
      `- **Stein-Hall Viscosity**: **35 – 55 seconds** (tested at 40°C / 105°F). Higher for heavy liners; lower for lightweight recycled mediums.\n` +
      `- **Borax Cross-linking**: 0.15% - 0.25%. Borax forms borate-hydroxyl bridges, creating tack and preventing glue from penetrating too deeply into the paper.\n` +
      `- **Total Solids Content**: 24% – 28%. Higher solids require less thermal energy to evaporate moisture, reducing warp.`;
  }

  return `### 🧠 Corrugation Plant Reasoning Engine (mg-manager-3ab66)\n\n` +
    `I am actively analyzing your live factory database and ready to provide operational reasoning:\n\n` +
    `1. 🔍 **Queue & Bottleneck Audit**: Ask me to evaluate active pending runs against available stock and press capacities.\n` +
    `2. ⚠️ **Halted Run Diagnostics**: Ask me to analyze any 'Not Completed' runs and recommend physical floor troubleshooting.\n` +
    `3. 📦 **Material Reconciliation**: Inquire about reel allocation, supplier dependencies, and sheet dimensions.\n` +
    `4. 🏭 **Technical Corrugator Diagnostics**: Ask about line speed balancing, starch gel temp, warp elimination, and McKee BCT.\n\n` +
    `What aspect of factory operations shall we analyze?`;
}

function parseBody(req: IncomingMessage): Promise<any> {
  const reqWithBody = req as any;
  if (reqWithBody.body && typeof reqWithBody.body === 'object') {
    return Promise.resolve(reqWithBody.body);
  }

  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => {
      resolve({});
    });
  });
}

function sendJsonResponse(res: VercelResponse, statusCode: number, data: any) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(statusCode);
    res.json(data);
    return;
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

// Clean AI Endpoint: /api/ai/chat
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Support CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJsonResponse(res, 405, { error: 'Method Not Allowed' });
    return;
  }

  let body: any = {};
  try {
    body = await parseBody(req);
  } catch {
    body = {};
  }

  const { message, databaseContext } = body || {};

  if (!message || typeof message !== 'string') {
    sendJsonResponse(res, 400, { error: 'Message text is required.' });
    return;
  }

  // --------------------------------------------------------------------------
  // Prepared for local Ollama connection (model: gemma4:12b)
  // When ready to connect to your local Ollama:
  //
  // const ollamaPayload = {
  //   model: 'gemma4:12b',
  //   messages: [
  //     { role: 'user', content: message }
  //   ],
  //   stream: false
  // };
  // const ollamaRes = await fetch(process.env.OLLAMA_URL || 'http://localhost:11434/api/chat', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(ollamaPayload)
  // });
  // const ollamaData = await ollamaRes.json();
  // const replyText = ollamaData.message?.content;
  // --------------------------------------------------------------------------

  const replyText = getCorrugationDomainFallback(message, databaseContext);

  sendJsonResponse(res, 200, { reply: replyText });
}
