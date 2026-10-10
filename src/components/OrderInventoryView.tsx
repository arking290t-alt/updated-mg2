import React, { useState } from 'react';
import { 
  Package, 
  Layers, 
  PlusCircle, 
  Clock, 
  Factory, 
  Building2, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';
import { CorrugationJob } from '../types/job';

interface OrderInventoryViewProps {
  jobs: CorrugationJob[];
  onOrderWithoutJob: () => void;
  onOrderForJob: (job: CorrugationJob) => void;
}

export const OrderInventoryView: React.FC<OrderInventoryViewProps> = ({
  jobs,
  onOrderWithoutJob,
  onOrderForJob,
}) => {
  const [activeTab, setActiveTab] = useState<'jobs_without_inventory' | 'without_job'>('jobs_without_inventory');

  // Jobs that don't have inventory ordered yet
  const jobsWithoutInventory = jobs.filter((j) => !j.hasInventory);
  const jobsWithInventory = jobs.filter((j) => j.hasInventory);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="text-xs font-mono text-amber-400 uppercase tracking-wide">Procurement & Allocation</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Order Inventory</h2>
          <p className="text-xs text-slate-400 mt-1">
            Allocate raw paper reels, cut board sheets, or order buffer stock
          </p>
        </div>

        {/* Quick Order Without Job CTA */}
        <button
          onClick={onOrderWithoutJob}
          className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-md self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>Order Without Job</span>
        </button>
      </div>

      {/* The 2 Primary Options Requested by User: 1) Order Without Job, 2) Existing Jobs Without Inventory */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Option A: Existing Jobs Without Inventory */}
        <div
          onClick={() => setActiveTab('jobs_without_inventory')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'jobs_without_inventory'
              ? 'bg-amber-500/10 border-amber-500 shadow-sm'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                activeTab === 'jobs_without_inventory' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Existing Jobs Without Inventory</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
              {jobsWithoutInventory.length} Jobs
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Select an active plant job to order specific stock types, sheet sizes, and press printing requirements.
          </p>
        </div>

        {/* Option B: Order Without Job */}
        <div
          onClick={() => setActiveTab('without_job')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'without_job'
              ? 'bg-amber-500/10 border-amber-500 shadow-sm'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                activeTab === 'without_job' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>
                <Package className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Order Without Job</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-800 text-slate-300 font-semibold">
              General Stock
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Order standard raw paper reels, Kraft liners, fluting, or packaging stock for general warehouse inventory.
          </p>
        </div>

      </div>

      {/* Content depending on selected option */}
      {activeTab === 'jobs_without_inventory' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Existing Jobs Awaiting Inventory ({jobsWithoutInventory.length})</span>
            </h3>
            <span className="text-xs text-slate-400">Click any job below to fill stock details</span>
          </div>

          {jobsWithoutInventory.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-white">All Active Jobs Have Inventory Ordered!</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                No jobs are currently waiting for raw material allocation. You can order general inventory or create a new job.
              </p>
              <button
                onClick={onOrderWithoutJob}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors cursor-pointer"
              >
                Order General Inventory (Without Job)
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {jobsWithoutInventory.map((job) => {
                const isFactory = job.jobPlacement === 'Factory';

                return (
                  <div
                    key={job.id}
                    onClick={() => onOrderForJob(job)}
                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/60 hover:bg-slate-900/80 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                            isFactory
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                          }`}
                        >
                          {isFactory ? <Factory className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                          <span>{job.jobPlacement}</span>
                        </span>

                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          {job.jobType}
                        </span>

                        <span className="text-[11px] font-mono text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                          Needs Inventory
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                        {job.jobName}
                      </h4>

                      <p className="text-xs text-slate-400">
                        Created on {job.createdAt} {job.notes && `· Note: ${job.notes}`}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOrderForJob(job);
                      }}
                      className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 group-hover:bg-amber-400 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-sm"
                    >
                      <span>Order Inventory for this Job</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Option 2 Content: Order Without Job */}
      {activeTab === 'without_job' && (
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Order General Plant Inventory</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              Order raw paper reels, corrugated sheets, starch adhesives, or supplies not tied to an existing job order. You will specify stock type, job size, receiving source, print specifications, and quantity.
            </p>
          </div>
          <button
            onClick={onOrderWithoutJob}
            className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors cursor-pointer shadow-md inline-flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>Open Inventory Order Form</span>
          </button>
        </div>
      )}

    </div>
  );
};
