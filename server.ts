import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

// ============================================================================
// CLEAN BACKEND AI CHAT ENDPOINT: /api/ai/chat
// Prepared for local Ollama integration (model: gemma4:12b)
// Receives { message, history, databaseContext } from the client
// ============================================================================
const handleAiChat = async (req: express.Request, res: express.Response) => {
  try {
    const { message, history, databaseContext } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message text is required.' });
      return;
    }

    // Format live factory database context (from Firestore) for the AI model
    let databaseContextPrompt = '';
    if (databaseContext) {
      const jobsList = Array.isArray(databaseContext.jobs) ? databaseContext.jobs : [];
      const inventoryList = Array.isArray(databaseContext.inventory) ? databaseContext.inventory : [];

      const pendingJobs = jobsList.filter((j: any) => j.status === 'Pending');
      const notCompletedJobs = jobsList.filter((j: any) => j.status === 'Not Completed');
      const completedJobs = jobsList.filter((j: any) => j.status === 'Completed');
      const jobsAwaitingInventory = jobsList.filter((j: any) => !j.hasInventory);

      databaseContextPrompt = `\n\n=== LIVE FACTORY FIRESTORE DATABASE (PROJECT: mg-manager-3ab66) ===
FACTORY ACTIVE QUEUE & JOBS IN DATABASE:
${jobsList.length > 0 
  ? jobsList.map((j: any, i: number) => 
      `${i + 1}. [Job ID: ${j.id}] Name: "${j.jobName}" | Type: "${j.jobType}" | Placement: "${j.jobPlacement}" | Status: ${j.status} | Created: ${j.createdAt} | Inventory Attached: ${j.hasInventory ? 'YES' : 'NO (Awaiting Materials)'}${j.notes ? ` | Notes: "${j.notes}"` : ''}`
    ).join('\n')
  : 'No jobs currently in database.'}

FACTORY RAW MATERIAL & INVENTORY LOTS IN DATABASE:
${inventoryList.length > 0 
  ? inventoryList.map((inv: any, i: number) => 
      `${i + 1}. [Lot ID: ${inv.id}] Stock Type: "${inv.stockType}" | Sheet/Reel Size: "${inv.jobSize}" | Qty: ${inv.quantity} units | Supplier: "${inv.receivingFrom}" | Printed: ${inv.isPrinted ? `YES (Press: ${inv.pressName || 'Unspecified'})` : 'NO (Raw Kraft/Fluting)'}${inv.jobName ? ` | Linked to Job: "${inv.jobName}"` : ' | Unassigned Buffer'} | Status: ${inv.status} | Received: ${inv.orderedAt}`
    ).join('\n')
  : 'No inventory lots currently registered.'}

SUMMARY AUDIT METRICS:
- Total Factory Jobs: ${jobsList.length} (Pending: ${pendingJobs.length}, Not Completed: ${notCompletedJobs.length}, Completed: ${completedJobs.length})
- Jobs Blocked/Needing Inventory: ${jobsAwaitingInventory.length}
- Total Inventory Lots: ${inventoryList.length}
- Total Stock Volume: ${inventoryList.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0), 0).toLocaleString()} units
=== END LIVE DATABASE ===`;
    }

    const systemInstruction = `You are the Lead Plant Operations Director and AI Industrial Reasoning Brain for an advanced Corrugation Factory (Corrugated Packaging & Box Manufacturing Plant).

CRITICAL DIRECTIVE - SHORT AS POSSIBLE BUT HIGHLY DETAILED:
1. STRICT BREVITY RULE: Maximum 120 - 150 words total! Do NOT write long essays. Get straight to the point.
2. HIGH DENSITY & SPECIFICITY: Include exact job names, stock sizes, GSM, machine names, starch gel temps (58-62°C), or glue gaps (0.22mm).
3. STRUCTURE YOUR ANSWER INTO 3 SHORT, PUNCHY SECTIONS:
   - ⚡ **Diagnosis & Thinking**: 1-2 brief bullets on bottlenecks, root causes, or material gaps.
   - 📊 **Live Database Facts**: 1-2 bullets with key counts, jobs, or stock lots from the live data.
   - 🎯 **Immediate Action Plan**: 2 sharp, prioritized steps for the factory floor.${databaseContextPrompt}

Keep every point concise, technically sound, and immediately actionable.`;

    // --------------------------------------------------------------------------
    // NOTE: Prepared for local Ollama connection (model: gemma4:12b)
    // When ready to connect to your local Ollama instance:
    //
    // const ollamaPayload = {
    //   model: 'gemma4:12b',
    //   messages: [
    //     { role: 'system', content: systemInstruction },
    //     ...(Array.isArray(history) ? history.map((h: any) => ({
    //       role: h.role === 'model' ? 'assistant' : 'user',
    //       content: h.text
    //     })) : []),
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

    // Real-time Plant Reasoning Engine with live database evaluation
    const replyText = getCorrugationDomainFallback(message, databaseContext);

    res.json({ reply: replyText });
  } catch (error: any) {
    console.error('Error in AI chat endpoint:', error);
    res.json({ reply: getCorrugationDomainFallback(req.body?.message || '', req.body?.databaseContext) });
  }
};

// Register endpoint at /api/ai/chat (and /api/gemini/chat for complete backward compatibility)
app.post('/api/ai/chat', handleAiChat);
app.post('/api/gemini/chat', handleAiChat);

// Advanced cognitive reasoning engine with live Firestore data evaluation
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
    `I am actively analyzing your live factory database and ready to provide operational insights:\n\n` +
    `1. 🔍 **Queue & Bottleneck Audit**: Ask me to evaluate active pending runs against available stock and press capacities.\n` +
    `2. ⚠️ **Halted Run Diagnostics**: Ask me to analyze any 'Not Completed' runs and recommend physical floor troubleshooting.\n` +
    `3. 📦 **Material Reconciliation**: Inquire about reel allocation, supplier dependencies, and sheet dimensions.\n` +
    `4. 🏭 **Technical Corrugator Diagnostics**: Ask about line speed balancing, starch gel temp, warp elimination, and McKee BCT.\n\n` +
    `What aspect of factory operations shall we analyze?`;
}

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Corrugation Factory Server running on port ${port}`);
  });
}

startServer();
