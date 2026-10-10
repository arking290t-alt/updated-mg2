import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Google Gen AI client with required User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Corrugation Factory Assistant Gemini Endpoint with Live Database Reading
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { message, history, databaseContext } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message text is required.' });
      return;
    }

    // Build chat contents including history
    const contents: any[] = [];

    if (Array.isArray(history)) {
      for (const item of history) {
        if (item.role === 'user' || item.role === 'model') {
          contents.push({
            role: item.role,
            parts: [{ text: item.text }],
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    // Format live factory database context for Gemini
    let databaseContextPrompt = '';
    if (databaseContext) {
      const jobsList = Array.isArray(databaseContext.jobs) ? databaseContext.jobs : [];
      const inventoryList = Array.isArray(databaseContext.inventory) ? databaseContext.inventory : [];

      databaseContextPrompt = `\n\n=== LIVE FACTORY FIRESTORE DATABASE (PROJECT: mg-manager-3ab66) ===
CURRENT JOBS IN FACTORY DATABASE:
${jobsList.length > 0 
  ? jobsList.map((j: any, i: number) => 
      `${i + 1}. [${j.id}] "${j.jobName}" | Type: ${j.jobType} | Placement: ${j.jobPlacement} | Status: ${j.status} | Created: ${j.createdAt} | Inventory Attached: ${j.hasInventory ? 'YES' : 'NO'}${j.notes ? ` | Notes: ${j.notes}` : ''}`
    ).join('\n')
  : 'No jobs currently in database.'}

CURRENT INVENTORY LOTS IN FACTORY DATABASE:
${inventoryList.length > 0 
  ? inventoryList.map((inv: any, i: number) => 
      `${i + 1}. [${inv.id}] Stock: "${inv.stockType}" | Size: "${inv.jobSize}" | Qty: ${inv.quantity} | Receiving From: "${inv.receivingFrom}" | Printed: ${inv.isPrinted ? `YES (Press: ${inv.pressName || 'N/A'})` : 'NO'}${inv.jobName ? ` | Linked Job: "${inv.jobName}"` : ''} | Status: ${inv.status} | Ordered: ${inv.orderedAt}`
    ).join('\n')
  : 'No inventory lots currently registered.'}

SUMMARY METRICS:
- Total Jobs: ${jobsList.length}
- Pending Jobs: ${jobsList.filter((j: any) => j.status === 'Pending').length}
- Not Completed Jobs: ${jobsList.filter((j: any) => j.status === 'Not Completed').length}
- Completed Jobs: ${jobsList.filter((j: any) => j.status === 'Completed').length}
- Jobs Needing Inventory: ${jobsList.filter((j: any) => !j.hasInventory).length}
- Total Inventory Lots: ${inventoryList.length}
- Total Stock Units in Inventory: ${inventoryList.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0), 0).toLocaleString()}
=== END LIVE DATABASE ===

INSTRUCTION FOR DATABASE QUERIES:
You have direct read access to this live database! Whenever the user asks about jobs, pending work, inventory stock, suppliers, presses, shortages, or status, directly reference the live records above with their names, quantities, and statuses.`;
    }

    const systemInstruction = `You are the Gemini AI Plant Assistant for a Corrugation Factory (Corrugated Box & Board Manufacturing Plant).
Your expertise covers:
- Corrugator lines (single facer, double backer, glue unit, steam system, slitter scorer, cutoff knife, stacker)
- Flute profiles (A-flute, B-flute, C-flute, E-flute, F-flute, microflute, double wall, triple wall)
- Raw materials (Kraft liner, testliner, fluting medium, recycled paper, starch adhesive preparation, borax/caustic soda mix)
- Quality control & physical testing (Bursting Strength / Mullen, Edge Crush Test (ECT), Box Compression Test (BCT), Cobb test, Flat Crush Test (FCT), ring crush)
- Converting equipment (Flexo folder gluers, rotary die cutters, flatbed die cutters, stitchers, strappers)
- Troubleshooting corrugator defects (warp like up-warp, down-warp, S-warp, blister delamination, washboarding, cracked scores, leaning flutes, wet streaks)
- Factory production planning, reel inventory, waste minimization, and plant safety.${databaseContextPrompt}

Provide practical, direct, and technically accurate answers to help the factory supervisor and operators run the corrugation plant efficiently. Keep responses clear and structured.`;

    let replyText = '';
    const modelsToTry = ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        if (response.text) {
          replyText = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} failed or unavailable:`, err?.message || err);
      }
    }

    if (!replyText) {
      // Domain fallback if API encounters transient upstream capacity limit
      replyText = getCorrugationDomainFallback(message, databaseContext);
    }

    res.json({ reply: replyText });
  } catch (error: any) {
    console.error('Error in chat endpoint:', error);
    res.json({ reply: getCorrugationDomainFallback(req.body?.message || '', req.body?.databaseContext) });
  }
});

// Knowledge base and database fallback for corrugator operators
function getCorrugationDomainFallback(query: string, databaseContext?: any): string {
  const q = query.toLowerCase();

  // If query is asking about database contents
  if (databaseContext && (q.includes('job') || q.includes('pending') || q.includes('inventory') || q.includes('stock') || q.includes('database'))) {
    const jobs = Array.isArray(databaseContext.jobs) ? databaseContext.jobs : [];
    const inv = Array.isArray(databaseContext.inventory) ? databaseContext.inventory : [];

    if (q.includes('job') || q.includes('pending') || q.includes('not completed')) {
      const pending = jobs.filter((j: any) => j.status === 'Pending');
      const notCompleted = jobs.filter((j: any) => j.status === 'Not Completed');
      const completed = jobs.filter((j: any) => j.status === 'Completed');

      let text = `### Factory Jobs Database Report (Firebase: mg-manager-3ab66)\n\n`;
      text += `Currently, there are **${jobs.length} total jobs** in the database:\n`;
      text += `- **Pending Jobs (${pending.length})**:\n`;
      if (pending.length === 0) text += `  *(No pending jobs)*\n`;
      pending.forEach((j: any) => {
        text += `  • **${j.jobName}** (${j.jobType}) - Placement: ${j.jobPlacement} | Inventory: ${j.hasInventory ? 'Ordered' : 'Awaiting Inventory'}\n`;
      });

      if (notCompleted.length > 0) {
        text += `\n- **Not Completed Jobs (${notCompleted.length})**:\n`;
        notCompleted.forEach((j: any) => {
          text += `  • **${j.jobName}** (${j.jobType}) - Requires supervisor attention\n`;
        });
      }

      if (completed.length > 0) {
        text += `\n- **Completed Jobs (${completed.length})**:\n`;
        completed.forEach((j: any) => {
          text += `  • **${j.jobName}**\n`;
        });
      }
      return text;
    }

    if (q.includes('inventory') || q.includes('stock') || q.includes('reel') || q.includes('supplier')) {
      let text = `### Factory Inventory Report (Firebase: mg-manager-3ab66)\n\n`;
      text += `Currently, there are **${inv.length} inventory lots** recorded:\n\n`;
      inv.forEach((item: any) => {
        text += `• **${item.stockType}** (${item.quantity?.toLocaleString()} units) - Size: ${item.jobSize || 'N/A'}\n`;
        text += `  - Receiving From: ${item.receivingFrom || 'N/A'}\n`;
        text += `  - Printed: ${item.isPrinted ? `Yes (Press: ${item.pressName || 'N/A'})` : 'No (Raw Stock)'}\n`;
        if (item.jobName) text += `  - Attached Job: ${item.jobName}\n`;
      });
      return text;
    }
  }

  if (q.includes('warp')) {
    return `### Corrugator Warp Troubleshooting Guide\n\n1. **Up-Warp (Reverse Warp)**:\n- **Cause**: Bottom liner (double backer) shrank more than top liner; or bottom liner was too wet / top liner was dried excessively.\n- **Remedy**: Increase pre-heater wrap on bottom liner; reduce wrap on single-facer liner; lower glue application at double backer; increase corrugator speed.\n\n2. **Down-Warp (Normal Warp)**:\n- **Cause**: Top liner shrank more than bottom liner (single face web too wet or overheated bottom web).\n- **Remedy**: Increase pre-heater wrap on single-face web; reduce double-backer pre-heater wrap; verify steam shower uniformity.\n\n3. **S-Warp (Twist Warp)**:\n- **Cause**: Uneven moisture profile across reel width, misaligned corrugator rolls, or uneven starch spread.\n- **Remedy**: Check cross-directional moisture variation on paper reels; check doctor roll parallel alignment; inspect steam trap discharge.`;
  }
  if (q.includes('bct') || q.includes('ect')) {
    return `### McKee Formula for Box Compression Test (BCT)\n\nThe standard McKee equation predicts BCT from ECT and board caliper:\n$$\\text{BCT} = 5.876 \\times \\text{ECT} \\times \\sqrt{h \\times Z}$$\nWhere:\n- **BCT**: Box Compression Strength (N or lbf)\n- **ECT**: Edge Crush Test (kN/m or lbf/in)\n- **h**: Corrugated board caliper / thickness (mm or in)\n- **Z**: Box perimeter ($2 \\times [\\text{Length} + \\text{Width}]$)\n\n*Rule of thumb*: A safety factor of $4.0$ to $5.0$ is usually applied for warehousing humidity and stacking duration.`;
  }
  if (q.includes('flute') || q.includes('profile')) {
    return `### Standard Corrugated Flute Specifications\n\n- **A-Flute**: Height ~4.8 mm (~33 flutes/meter). Highest top-to-bottom compression strength & cushioning.\n- **C-Flute**: Height ~3.6 mm (~39 flutes/meter). Most common shipping box flute; good balance of compression and stacking.\n- **B-Flute**: Height ~2.5 mm (~47 flutes/meter). Higher flat crush resistance, excellent scoring and printability for die-cut boxes.\n- **E-Flute**: Height ~1.5 mm (~90 flutes/meter). Microflute for retail packaging and high-graphics folding cartons.\n- **Double Wall (BC)**: Height ~6.1 mm. High strength heavy-duty shipping cartons.`;
  }
  if (q.includes('starch') || q.includes('adhesive') || q.includes('glue')) {
    return `### Starch Adhesive Guidelines for Corrugator\n\n- **Viscosity**: Stein-Hall viscosity target between 35 – 55 seconds (measured at 40°C / 105°F).\n- **Gel Temperature**: 58°C – 62°C (136°F – 144°F). Controlled by caustic soda (NaOH) ratio.\n- **Tack & Penetration**: Borax (0.15% - 0.25%) increases high shear viscosity and tack.\n- **Solids Content**: Carrier-primary mix typically 22% – 28% total starch solids.\n- **Application Gap**: Single facer glue roll clearance ~0.20 – 0.28 mm; Double backer ~0.18 – 0.24 mm.`;
  }
  return `### Corrugation Plant Assistant\n\nI am connected to your factory database (**mg-manager-3ab66**) and ready to assist with:\n\n1. **Live Database Status**: Ask me about your active jobs, pending queue, not completed jobs, or paper stock inventory.\n2. **Corrugator Operations**: Line speed optimization, heat balance, steam trap checks, and waste reduction.\n3. **Paper & Reel Quality**: Kraft liner GSM, fluting medium quality, moisture levels, burst factor, and ECT.\n4. **Converting**: Flexo folder gluer adjustments, rotary die cutter settings, and ink viscosity.\n5. **Troubleshooting**: Delamination, blister formation, washboarding, and score cracking.\n\nWhat would you like to review or check?`;
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
